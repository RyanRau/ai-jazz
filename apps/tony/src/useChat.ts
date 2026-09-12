import { useEffect, useRef, useState } from "react";
import type { FileDropzoneValue } from "bluestar";
import { pb } from "./pb";
import { useAuthRecord } from "./useAuth";
import { useGatewayAuth } from "./useGatewayAuth";
import { GATEWAY_URL } from "./gateway";
import { parseSseLines, deltaContent } from "./sse";

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  system_prompt: string;
  // Compaction state -- see compactChat(). summary is what stands in for
  // every message at or before summarized_through once compaction has run;
  // both empty until then.
  summary: string;
  summarized_through: string;
  created: string;
  updated: string;
};
export type MessageStatus = "pending" | "streaming" | "complete" | "error";
export type SearchResult = { title: string; url: string; snippet: string };
// `type` is missing on tool-call records saved before this field existed --
// treated as "web_search" (see toolCallType() in ChatPage.tsx), the only
// shape that existed then.
export type ToolCallRecord =
  | { type?: "web_search"; query: string; results: SearchResult[] }
  | { type: "fetch_url"; url: string; title?: string | null; content?: string; error?: string };
// "uploaded" is a document (pdf/csv/txt/md) the user attached, read to
// plain text server-side; "generated" is a write_file tool call's output,
// offered back as a download. `content` is missing when `error` is set (an
// unreadable upload, or an unsupported/oversized write_file call).
export type AttachmentRecord = {
  kind: "uploaded" | "generated";
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  content?: string;
  error?: string;
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  tokens_in: number;
  tokens_out: number;
  response_ms: number;
  tool_calls: ToolCallRecord[];
  attachments: AttachmentRecord[];
  created: string;
};
export type ModelInfo = {
  id: string;
  vision: boolean;
  context_size: number | null;
  size_bytes: number | null;
  description: string | null;
  best_for: string | null;
};
type IdsEvent = {
  type: "ids";
  chat_id: string;
  user_message_id: string;
  assistant_message_id: string;
};

// Mirrors gateway.py's _compose_content_with_attachments -- what's actually
// sent to the model for a message includes its uploaded attachments' text,
// even though the displayed/stored `content` stays just what the user
// typed. Used both to replay past turns (history, below) and would need no
// change for a fresh turn's own attachments, since /v1/chat/send composes
// those server-side from the raw upload.
function composeContentWithAttachments(m: ChatMessage): string {
  const parts = [m.content];
  for (const a of m.attachments) {
    if (a.kind === "uploaded" && a.content) {
      parts.push(`\n\n--- ${a.filename} ---\n${a.content}`);
    }
  }
  return parts.join("");
}

// How many of the most recent messages compactChat() always keeps verbatim
// (roughly the last few turns) rather than folding into the summary.
const KEEP_RECENT_MESSAGES = 6;

// Mirrors chat.pb.js's title derivation so the optimistic chat-list entry
// (added the moment a new chat starts, before the next refresh) matches
// what the server will actually store.
function deriveTitle(content: string): string {
  return content.length > 60 ? content.substring(0, 60) + "…" : content;
}

function isIdsEvent(ev: Record<string, unknown>): ev is IdsEvent {
  return ev.type === "ids" && typeof ev.chat_id === "string";
}

/**
 * All of ChatPage's state and the /v1/chat/send streaming logic, lifted out
 * so `App.tsx` can call this once and hand the same instance to both
 * `SideNav` (the chat-history list, rendered in its `top` slot) and
 * `ChatPage` (the thread) -- they need to share one `chats`/`selectedChatId`
 * rather than each keeping their own copy. Generation is driven by
 * gateway.py's /v1/chat/send as a background task independent of this
 * page's connection (see that file's _generate_chat_response), so a message
 * started here keeps going and gets saved even if you close the tab. This
 * hook picks that up two ways: live, by reading the SSE response while it's
 * open, and by polling apps/pocketbase/pb_hooks/chat.pb.js's GET route
 * whenever the last message is still pending/streaming -- the same
 * mechanism covers "I switched to another chat mid-stream" and "I came back
 * ten minutes later."
 */
export function useChat() {
  // App.tsx calls this hook unconditionally, before its own `if (!record)`
  // gate -- so refreshChats()'s own effect below can't assume `record`
  // exists the way it could when this lived inside ChatPage, a component
  // that only ever mounted post-login.
  const record = useAuthRecord();
  const { apiKey, recoverFromUnauthorized } = useGatewayAuth();

  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);
  const [model, setModel] = useState("");
  // Only meaningful for a new (not-yet-started) chat -- an existing chat's
  // system prompt lives on its ChatSummary and is edited via
  // updateChatSystemPrompt() instead.
  const [systemPromptDraft, setSystemPromptDraft] = useState("");

  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // "all" is the full-list page (AllChatsPage), reached from the "Show all
  // chats" row in SideNav's expandedContent -- selecting a chat or starting
  // a new one always drops back to "thread", the same way clicking either
  // one already clears `messages`.
  const [chatsView, setChatsView] = useState<"thread" | "all">("thread");

  const [draft, setDraft] = useState("");
  // Both only meaningful for the *next* message to send -- cleared once
  // it's on its way. Images are vision-gated and never persisted/replayed
  // (same one-turn-only scope as Playground's own image attachment);
  // documents are read server-side and their extracted text does persist
  // (see ChatMessage.attachments / composeContentWithAttachments).
  const [pendingImage, setPendingImage] = useState<FileDropzoneValue | null>(null);
  const [pendingDocument, setPendingDocument] = useState<FileDropzoneValue | null>(null);
  const [sending, setSending] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${GATEWAY_URL}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(
        (data: {
          data: {
            id: string;
            vision?: boolean;
            context_size?: number | null;
            size_bytes?: number | null;
            description?: string | null;
            best_for?: string | null;
          }[];
        }) =>
          setModels(
            data.data.map((m) => ({
              id: m.id,
              vision: m.vision === true,
              context_size: m.context_size ?? null,
              size_bytes: m.size_bytes ?? null,
              description: m.description ?? null,
              best_for: m.best_for ?? null,
            }))
          )
      )
      .catch(() => setModels("unavailable"));
  }, [apiKey]);

  function refreshChats() {
    return pb
      .send<{ chats: ChatSummary[] }>("/api/custom/llm/chats", { method: "GET" })
      .then((res) => setChats(res.chats));
  }

  // Edits an existing chat's system prompt (a new chat's is set at creation
  // time via `send()` instead, from `systemPromptDraft`). Takes effect on
  // the chat's next turn -- see gateway.py's effective_system_prompt.
  function updateChatSystemPrompt(chatId: string, systemPrompt: string) {
    return pb
      .send<{ id: string; system_prompt: string }>("/api/custom/llm/chats/system_prompt", {
        method: "POST",
        body: { chat_id: chatId, system_prompt: systemPrompt },
      })
      .then((res) => {
        setChats(
          (prev) =>
            prev?.map((c) => (c.id === chatId ? { ...c, system_prompt: res.system_prompt } : c)) ??
            prev
        );
      });
  }

  useEffect(() => {
    if (!record) return;
    refreshChats();
  }, [record]);

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
    setSystemPromptDraft("");
    setPendingImage(null);
    setPendingDocument(null);
    setError(null);
    setChatsView("thread");
  }

  function selectChat(id: string) {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedChatId(id);
    setPendingImage(null);
    setPendingDocument(null);
    setChatsView("thread");
  }

  function showAllChats() {
    setChatsView("all");
  }

  function backToThread() {
    setChatsView("thread");
  }

  async function sendWith(key: string, retryOn401: boolean): Promise<void> {
    const content = draft.trim();
    const image = pendingImage;
    const document = pendingDocument;
    const chat = chats?.find((c) => c.id === selectedChatId);
    const sendModel = chat?.model || model;
    // A compacted chat's summary stands in for everything at or before
    // summarized_through (see compactChat()) -- only messages after that
    // point get replayed verbatim.
    const summarizedThrough = chat?.summarized_through || "";
    const replayable = summarizedThrough
      ? messages.filter((m) => m.created > summarizedThrough)
      : messages;
    const history = replayable.map((m) => ({
      role: m.role,
      content: composeContentWithAttachments(m),
    }));
    // Only meaningful for a brand-new chat -- an existing chat's system
    // prompt already lives server-side and is resolved fresh by the gateway
    // regardless of what (if anything) is sent here. Falls back to the
    // signed-in user's own default when the chat doesn't set its own.
    const defaultSystemPrompt = (record?.default_system_prompt as string | undefined) || "";
    const effectiveSystemPrompt = selectedChatId
      ? ""
      : systemPromptDraft.trim() || defaultSystemPrompt.trim();
    // Vision-gated content parts for this turn only -- never persisted or
    // replayed (see ChatPage.tsx/PACKAGES.md on why images stay one-turn).
    const newTurnContent = image
      ? [
          { type: "text", text: content },
          { type: "image_url", image_url: { url: image.dataUrl } },
        ]
      : content;

    setDraft("");
    setPendingImage(null);
    setPendingDocument(null);
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
          messages: [...history, { role: "user", content: newTurnContent }],
          system_prompt: effectiveSystemPrompt || undefined,
          attachments: document
            ? [{ filename: document.name, data_url: document.dataUrl }]
            : undefined,
        }),
        signal: controller.signal,
      });

      if (r.status === 401 && retryOn401) {
        const fresh = await recoverFromUnauthorized();
        // null means the session itself is gone -- recoverFromUnauthorized
        // already cleared it, so App.tsx drops back to the login screen.
        if (!fresh) return;
        setDraft(content); // restore -- sendWith re-reads `draft` on retry
        setPendingImage(image);
        setPendingDocument(document);
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
                  system_prompt: effectiveSystemPrompt,
                  summary: "",
                  summarized_through: "",
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
                attachments: [],
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
                attachments: [],
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

  // Summarizes everything except the last KEEP_RECENT_MESSAGES messages
  // (plus, on a chat compacted before, whatever's accumulated since the
  // last compaction) via the gateway's own current model for this chat, so
  // future turns replay a short summary instead of the full transcript --
  // see gateway.py's /v1/chat/compact and useChat.ts's own
  // summarizedThrough filtering in sendWith(). A no-op when there isn't
  // enough new history yet to bother compacting.
  async function compactChat(): Promise<void> {
    if (!apiKey || !selectedChat) return;
    const alreadyCovered = selectedChat.summarized_through || "";
    const cutoffIndex = messages.length - KEEP_RECENT_MESSAGES;
    if (cutoffIndex <= 0) return;
    const toSummarize = messages.slice(0, cutoffIndex).filter((m) => m.created > alreadyCovered);
    if (toSummarize.length === 0) return;

    const transcript = [
      ...(selectedChat.summary
        ? [{ role: "user", content: `Summary so far:\n${selectedChat.summary}` }]
        : []),
      ...toSummarize.map((m) => ({ role: m.role, content: composeContentWithAttachments(m) })),
    ];
    const summarizedThrough = toSummarize[toSummarize.length - 1].created;

    setCompacting(true);
    setError(null);
    try {
      const r = await fetch(`${GATEWAY_URL}/v1/chat/compact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          model: selectedChat.model,
          transcript,
          summarized_through: summarizedThrough,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`);
      }
      const data: { summary: string; summarized_through: string } = await r.json();
      setChats(
        (prev) =>
          prev?.map((c) =>
            c.id === selectedChat.id
              ? { ...c, summary: data.summary, summarized_through: data.summarized_through }
              : c
          ) ?? prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't compact this chat.");
    } finally {
      setCompacting(false);
    }
  }

  const selectedChat = chats?.find((c) => c.id === selectedChatId) ?? null;
  const modelList = models === "unavailable" || models === null ? null : models;
  const lastMessage = messages[messages.length - 1];
  const generating = Boolean(
    lastMessage && (lastMessage.status === "pending" || lastMessage.status === "streaming")
  );

  // Known false only once a specific model's capabilities are actually
  // known (mirrors PlaygroundPage's own visionUnsupported) -- unknown
  // (null-ish modelList, or no model picked yet) never blocks the attach
  // control, only a confirmed-unsupported model does.
  const activeModelId = selectedChat?.model || model;
  const activeModelInfo = modelList?.find((m) => m.id === activeModelId);
  const visionUnsupported = activeModelInfo !== undefined && !activeModelInfo.vision;

  // The most recently completed assistant reply's prompt-token count is the
  // best available proxy for "how much of the context window the next turn
  // will start from" -- it already reflects system prompt + summary +
  // history + attachments as of that call. Only shown once both that and
  // the active model's context_size are known.
  const lastCompletedAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.status === "complete");
  const contextUsage =
    activeModelInfo?.context_size && lastCompletedAssistant && lastCompletedAssistant.tokens_in > 0
      ? { used: lastCompletedAssistant.tokens_in, total: activeModelInfo.context_size }
      : null;
  const canCompact = messages.length > KEEP_RECENT_MESSAGES;

  return {
    apiKey,
    modelList,
    model,
    setModel,
    systemPromptDraft,
    setSystemPromptDraft,
    defaultSystemPrompt: (record?.default_system_prompt as string | undefined) || "",
    updateChatSystemPrompt,
    chats,
    selectedChatId,
    selectedChat,
    chatsView,
    showAllChats,
    backToThread,
    messages,
    draft,
    setDraft,
    pendingImage,
    setPendingImage,
    pendingDocument,
    setPendingDocument,
    visionUnsupported,
    sending,
    error,
    send,
    newChat,
    selectChat,
    generating,
    threadEndRef,
    contextUsage,
    canCompact,
    compacting,
    compactChat,
  };
}

export type ChatState = ReturnType<typeof useChat>;
