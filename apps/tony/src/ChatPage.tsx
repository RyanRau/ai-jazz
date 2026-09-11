import { useEffect, useRef, useState } from "react";
import { css } from "goober";
import {
  Badge,
  breakpoints,
  Button,
  ChatBubble,
  Drawer,
  Dropdown,
  EmptyState,
  Flexbox,
  Header,
  Icon,
  Link,
  ListRow,
  Spinner,
  Text,
  TextAreaInput,
  useTheme,
} from "bluestar";
import { pb } from "./pb";
import { useAuthRecord } from "./useAuth";
import { getOrCreatePlaygroundKey, mintPlaygroundKey } from "./playgroundKey";
import { formatDate } from "./usageHelpers";
import { GATEWAY_URL } from "./gateway";

type ChatSummary = { id: string; title: string; model: string; created: string; updated: string };
type MessageStatus = "pending" | "streaming" | "complete" | "error";
type SearchResult = { title: string; url: string; snippet: string };
type ToolCallRecord = { query: string; results: SearchResult[] };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  tokens_in: number;
  tokens_out: number;
  response_ms: number;
  tool_calls: ToolCallRecord[];
  created: string;
};
type ModelInfo = { id: string; vision: boolean };
type IdsEvent = {
  type: "ids";
  chat_id: string;
  user_message_id: string;
  assistant_message_id: string;
};

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Mirrors gateway.py's _parse_sse_json_lines -- splits on complete lines,
// JSON-parses `data: {...}` lines, carries a trailing partial line over to
// the next chunk. The gateway relays raw upstream bytes verbatim, so this
// has to handle the same partial-line-across-chunks case it does.
function parseSseLines(buffer: string): { events: Record<string, unknown>[]; leftover: string } {
  const lines = buffer.split("\n");
  const leftover = lines.pop() ?? "";
  const events: Record<string, unknown>[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "" || payload === "[DONE]") continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      // Partial/garbled line -- skip it, the stream keeps going.
    }
  }
  return { events, leftover };
}

// Mirrors chat.pb.js's title derivation so the optimistic chat-list entry
// (added the moment a new chat starts, before the next refresh) matches
// what the server will actually store.
function deriveTitle(content: string): string {
  return content.length > 60 ? content.substring(0, 60) + "…" : content;
}

function isIdsEvent(ev: Record<string, unknown>): ev is IdsEvent {
  return ev.type === "ids" && typeof ev.chat_id === "string";
}

function deltaContent(ev: Record<string, unknown>): string | null {
  const choices = ev.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const delta = (choices[0] as Record<string, unknown>)?.delta as
    Record<string, unknown> | undefined;
  return typeof delta?.content === "string" ? delta.content : null;
}

const LIST_WIDTH = 280;

/**
 * Persistent, multi-turn chat -- laid out like OpenAI/Claude's own chat UI:
 * a chat-history list and the active thread, full-height and edge to edge
 * rather than boxed in a `Card`. The list renders twice, like `AppShell`'s
 * own nav does for its mobile drawer -- as a permanent column at `md` and
 * up, and inside a `Drawer` below that, opened from a menu button in the
 * thread header -- so switching chats on a phone never fights a cramped
 * fixed-height panel for space. Generation is driven by gateway.py's
 * /v1/chat/send as a background task independent of this page's connection
 * (see that file's _generate_chat_response), so a message started here keeps
 * going and gets saved even if you close the tab. This page shows it two
 * ways: live, by reading the SSE response while it's open, and by polling
 * apps/pocketbase/pb_hooks/chat.pb.js's GET route whenever a message is
 * still pending/streaming -- the same mechanism covers "I switched to
 * another chat mid-stream" and "I came back ten minutes later."
 */
export function ChatPage() {
  const record = useAuthRecord();
  const theme = useTheme();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);
  const [model, setModel] = useState("");

  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!record) return;
    getOrCreatePlaygroundKey(record.id)
      .then(setApiKey)
      .catch(() => setKeyError("Couldn't set up your personal key. Try reloading."));
  }, [record]);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${GATEWAY_URL}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { data: { id: string; vision?: boolean }[] }) =>
        setModels(data.data.map((m) => ({ id: m.id, vision: m.vision === true })))
      )
      .catch(() => setModels("unavailable"));
  }, [apiKey]);

  function refreshChats() {
    return pb
      .send<{ chats: ChatSummary[] }>("/api/custom/llm/chats", { method: "GET" })
      .then((res) => setChats(res.chats));
  }

  useEffect(() => {
    refreshChats();
  }, []);

  // Loads a selected chat's messages, then polls every 1.5s while the last
  // one is still generating -- skipped while this tab is actively streaming
  // it itself (the SSE read loop in send() is already more current than a
  // poll could be, and applying a lagging poll result over it would look
  // like the response jumping backwards).
  useEffect(() => {
    // Selecting a chat (or starting a new one) already clears `messages`
    // synchronously in the event handler that changes `selectedChatId` --
    // see selectChat()/newChat() -- so there's nothing to reset here, just
    // nothing to poll for.
    if (!selectedChatId) return;
    let cancelled = false;

    function fetchMessages() {
      pb.send<{ messages: ChatMessage[] }>("/api/custom/llm/chats/messages", {
        method: "GET",
        query: { chat: selectedChatId },
      }).then((res) => {
        if (!cancelled && !sendingRef.current) setMessages(res.messages);
      });
    }

    fetchMessages();
    const interval = window.setInterval(() => {
      setMessages((current) => {
        const last = current[current.length - 1];
        if (last && (last.status === "pending" || last.status === "streaming")) {
          fetchMessages();
        }
        return current;
      });
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedChatId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedChatId(null);
    setDraft("");
    setError(null);
    setHistoryOpen(false);
  }

  function selectChat(id: string) {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedChatId(id);
    setHistoryOpen(false);
  }

  async function sendWith(key: string, retryOn401: boolean): Promise<void> {
    const content = draft.trim();
    const chat = chats?.find((c) => c.id === selectedChatId);
    const sendModel = chat?.model || model;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setDraft("");
    setError(null);
    setSending(true);
    sendingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    let ids: IdsEvent | null = null;
    let accumulated = "";

    try {
      const r = await fetch(`${GATEWAY_URL}/v1/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          chat_id: selectedChatId || undefined,
          model: sendModel || undefined,
          messages: [...history, { role: "user", content }],
        }),
        signal: controller.signal,
      });

      if (r.status === 401 && retryOn401 && record) {
        const fresh = await mintPlaygroundKey(record.id);
        setApiKey(fresh);
        setDraft(content); // restore -- sendWith re-reads `draft` on retry
        return sendWith(fresh, false);
      }
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseLines(buffer);
        buffer = parsed.leftover;

        for (const ev of parsed.events) {
          if (isIdsEvent(ev)) {
            ids = ev;
            const now = new Date().toISOString();
            if (!selectedChatId) {
              // Optimistically add the new chat so the header/model badge
              // reflect it immediately -- otherwise this stays labeled "New
              // chat" for the whole first generation, since the real list
              // only refreshes once send() finishes.
              setChats((prev) => [
                {
                  id: ev.chat_id,
                  title: deriveTitle(content),
                  model: sendModel,
                  created: now,
                  updated: now,
                },
                ...(prev ?? []),
              ]);
              setSelectedChatId(ev.chat_id);
            }
            setMessages((prev) => [
              ...prev,
              {
                id: ev.user_message_id,
                role: "user",
                content,
                status: "complete",
                tokens_in: 0,
                tokens_out: 0,
                response_ms: 0,
                tool_calls: [],
                created: now,
              },
              {
                id: ev.assistant_message_id,
                role: "assistant",
                content: "",
                status: "streaming",
                tokens_in: 0,
                tokens_out: 0,
                response_ms: 0,
                tool_calls: [],
                created: now,
              },
            ]);
            continue;
          }
          const delta = deltaContent(ev);
          if (delta) {
            accumulated += delta;
            const text = accumulated;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const next = prev.slice();
              next[next.length - 1] = { ...next[next.length - 1], content: text };
              return next;
            });
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(
          e instanceof TypeError
            ? `Couldn't reach ${GATEWAY_URL} -- it isn't publicly reachable yet (see home-server/llm-gateway's README on the WireGuard tunnel).`
            : e instanceof Error
              ? e.message
              : "Something went wrong."
        );
      }
    } finally {
      setSending(false);
      sendingRef.current = false;
      abortRef.current = null;
      // The stream carries live text but not the authoritative record (final
      // status/token counts/response_ms) -- one more fetch picks those up.
      // Also covers the connection having dropped mid-stream: generation
      // keeps running server-side regardless, so this settles what's here.
      if (ids) {
        pb.send<{ messages: ChatMessage[] }>("/api/custom/llm/chats/messages", {
          method: "GET",
          query: { chat: ids.chat_id },
        }).then((res) => setMessages(res.messages));
      }
      refreshChats();
    }
  }

  async function send() {
    if (!apiKey || !draft.trim() || sending) return;
    await sendWith(apiKey, true);
  }

  if (chats === null) return null;

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;
  const modelList = models === "unavailable" || models === null ? null : models;
  const lastMessage = messages[messages.length - 1];
  const generating = Boolean(
    lastMessage && (lastMessage.status === "pending" || lastMessage.status === "streaming")
  );

  const chatList = (onNavigate: () => void, showTitle: boolean) => (
    <Flexbox direction="column" gap={12} style={{ padding: 12 }}>
      <Flexbox justifyContent={showTitle ? "space-between" : "flex-end"} alignItems="center">
        {showTitle && <Header variant="h3">Chats</Header>}
        <Button
          label="New chat"
          variant="creation"
          density="dense"
          onClick={() => {
            newChat();
            onNavigate();
          }}
        />
      </Flexbox>
      {chats.length === 0 ? (
        <Text variant="caption">No chats yet.</Text>
      ) : (
        <Flexbox direction="column" gap={4}>
          {chats.map((c) => (
            <ListRow
              key={c.id}
              title={c.title}
              subtitle={formatDate(c.updated)}
              selected={c.id === selectedChatId}
              onClick={() => {
                selectChat(c.id);
                onNavigate();
              }}
            />
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );

  return (
    <div
      className={css`
        display: flex;
        flex-direction: row;
        height: 100%;
        min-height: 0;
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius.lg};
        overflow: hidden;
      `}
    >
      <div
        className={css`
          width: ${LIST_WIDTH}px;
          flex-shrink: 0;
          height: 100%;
          overflow-y: auto;
          border-right: 1px solid ${theme.colors.border};
          background-color: ${theme.colors.surface};
          @media (max-width: ${breakpoints.md}px) {
            display: none;
          }
        `}
      >
        {chatList(() => {}, true)}
      </div>

      <Flexbox direction="column" grow={1} style={{ minWidth: 0, height: "100%", minHeight: 0 }}>
        <Flexbox
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={12}
          style={{
            flexShrink: 0,
            padding: "12px 16px",
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          <Flexbox alignItems="center" gap={8}>
            <button
              type="button"
              aria-label="Chat history"
              onClick={() => setHistoryOpen(true)}
              className={css`
                display: none;
                @media (max-width: ${breakpoints.md}px) {
                  display: flex;
                }
                align-items: center;
                background: none;
                border: 1px solid ${theme.colors.border};
                border-radius: ${theme.radius.md};
                padding: 8px;
                cursor: pointer;
                color: ${theme.colors.text};
                &:hover {
                  background-color: ${theme.colors.surfaceHover};
                }
                &:focus-visible {
                  outline: 2px solid ${theme.colors.focusRing};
                  outline-offset: 2px;
                }
              `}
            >
              <Icon name="menu" size={18} />
            </button>
            <Flexbox direction="column" gap={4}>
              <Header variant="h3">{selectedChat ? selectedChat.title : "New chat"}</Header>
              {selectedChat && (
                <Flexbox gap={8} alignItems="center">
                  <Badge variant="neutral">{selectedChat.model}</Badge>
                  <Text variant="caption">Started {formatDate(selectedChat.created)}</Text>
                </Flexbox>
              )}
            </Flexbox>
          </Flexbox>
          {!selectedChat &&
            (modelList ? (
              <div style={{ width: 240, maxWidth: "100%" }}>
                <Dropdown
                  label="Model"
                  options={[
                    { label: "Gateway default", value: "" },
                    ...modelList.map((m) => ({ label: m.id, value: m.id })),
                  ]}
                  value={model}
                  onChange={(v) => setModel(v ?? "")}
                />
              </div>
            ) : null)}
        </Flexbox>

        <div
          className={css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          `}
        >
          {messages.length === 0 ? (
            <EmptyState
              title={selectedChat ? "No messages" : "Start a new chat"}
              description="Send a message below to begin."
            />
          ) : (
            messages.map((m) => (
              <Flexbox key={m.id} direction="column" gap={8}>
                {m.tool_calls.length > 0 && (
                  <Flexbox direction="column" gap={8} style={{ padding: "0 4px" }}>
                    {m.tool_calls.map((tc, i) => (
                      <Flexbox key={i} direction="column" gap={4}>
                        <Text variant="caption">Searched the web: "{tc.query}"</Text>
                        {tc.results.length > 0 && (
                          <Flexbox direction="row" gap={12} flexWrap="wrap">
                            {tc.results.map((r) => (
                              <Link key={r.url} href={r.url} external variant="muted">
                                <Text variant="caption">{r.title}</Text>
                              </Link>
                            ))}
                          </Flexbox>
                        )}
                      </Flexbox>
                    ))}
                  </Flexbox>
                )}
                <ChatBubble role={m.role} content={m.content} status={m.status} />
                {m.role === "assistant" &&
                  m.status === "complete" &&
                  (m.tokens_in > 0 || m.tokens_out > 0 || m.response_ms > 0) && (
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {[
                        m.tokens_in > 0 && `${m.tokens_in.toLocaleString()} in`,
                        m.tokens_out > 0 && `${m.tokens_out.toLocaleString()} out`,
                        m.response_ms > 0 && formatElapsed(m.response_ms),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  )}
              </Flexbox>
            ))
          )}
          <div ref={threadEndRef} />
        </div>

        <Flexbox
          direction="column"
          gap={8}
          style={{
            flexShrink: 0,
            padding: 16,
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        >
          <TextAreaInput
            label="Message"
            value={draft}
            onChange={setDraft}
            rows={3}
            placeholder="Ask it something"
            isDisabled={sending}
          />
          <Flexbox gap={8} alignItems="center">
            <Button
              label={sending ? "Sending…" : "Send"}
              onClick={send}
              isDisabled={sending || !apiKey || !draft.trim()}
            />
            {generating && !sending && (
              <Flexbox gap={4} alignItems="center">
                <Spinner size={14} />
                <Text variant="caption">Still generating…</Text>
              </Flexbox>
            )}
          </Flexbox>
          {keyError && <Text color={theme.colors.error}>{keyError}</Text>}
          {error && <Text color={theme.colors.error}>{error}</Text>}
        </Flexbox>
      </Flexbox>

      <Drawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Chats">
        {chatList(() => setHistoryOpen(false), false)}
      </Drawer>
    </div>
  );
}
