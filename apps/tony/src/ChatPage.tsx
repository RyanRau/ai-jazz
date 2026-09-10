import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ChatBubble,
  Divider,
  Dropdown,
  EmptyState,
  Flexbox,
  Header,
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

// Same convention as PlaygroundPage.tsx.
const GATEWAY_URL = import.meta.env.VITE_LLM_GATEWAY_URL ?? "https://llm.ryanzrau.dev";

type ChatSummary = { id: string; title: string; model: string; created: string; updated: string };
type MessageStatus = "pending" | "streaming" | "complete" | "error";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  tokens_in: number;
  tokens_out: number;
  response_ms: number;
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

/**
 * Persistent, multi-turn chat -- two panels like KeysPage, chat list on the
 * left, thread on the right. Generation is driven by gateway.py's
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
  }

  function selectChat(id: string) {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedChatId(id);
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

  return (
    <Card padding={24}>
      <Flexbox gap={20} alignItems="flex-start">
        <Flexbox direction="column" gap={12} width={260} style={{ flexShrink: 0 }}>
          <Flexbox justifyContent="space-between" alignItems="center">
            <Header variant="h2">Chat</Header>
            <Button label="New chat" variant="creation" density="dense" onClick={newChat} />
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
                  onClick={() => selectChat(c.id)}
                />
              ))}
            </Flexbox>
          )}
        </Flexbox>

        <Divider direction="vertical" />

        <Flexbox direction="column" gap={16} grow={1} style={{ minWidth: 0 }}>
          <Flexbox justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={12}>
            <Flexbox direction="column" gap={4}>
              <Header variant="h2">{selectedChat ? selectedChat.title : "New chat"}</Header>
              {selectedChat && (
                <Flexbox gap={8} alignItems="center">
                  <Badge variant="neutral">{selectedChat.model}</Badge>
                  <Text variant="caption">Started {formatDate(selectedChat.created)}</Text>
                </Flexbox>
              )}
            </Flexbox>
            {!selectedChat &&
              (modelList ? (
                <div style={{ width: 260 }}>
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
            style={{
              minHeight: 320,
              maxHeight: 480,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "4px 4px 0",
            }}
          >
            {messages.length === 0 ? (
              <EmptyState
                title={selectedChat ? "No messages" : "Start a new chat"}
                description="Send a message below to begin."
              />
            ) : (
              messages.map((m) => (
                <ChatBubble key={m.id} role={m.role} content={m.content} status={m.status} />
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          <Divider />

          <Flexbox direction="column" gap={8}>
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
              {!sending &&
                lastMessage?.role === "assistant" &&
                lastMessage.status === "complete" &&
                lastMessage.response_ms > 0 && (
                  <Text variant="caption">
                    Responded in {formatElapsed(lastMessage.response_ms)}
                  </Text>
                )}
            </Flexbox>
          </Flexbox>

          {keyError && <Text color={theme.colors.error}>{keyError}</Text>}
          {error && <Text color={theme.colors.error}>{error}</Text>}
        </Flexbox>
      </Flexbox>
    </Card>
  );
}
