import { useEffect, useRef, useState } from "react";
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
export type ChatMessage = {
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
  const [sending, setSending] = useState(false);
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
    setError(null);
    setChatsView("thread");
  }

  function selectChat(id: string) {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedChatId(id);
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
    const chat = chats?.find((c) => c.id === selectedChatId);
    const sendModel = chat?.model || model;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    // Only meaningful for a brand-new chat -- an existing chat's system
    // prompt already lives server-side and is resolved fresh by the gateway
    // regardless of what (if anything) is sent here. Falls back to the
    // signed-in user's own default when the chat doesn't set its own.
    const defaultSystemPrompt = (record?.default_system_prompt as string | undefined) || "";
    const effectiveSystemPrompt = selectedChatId
      ? ""
      : systemPromptDraft.trim() || defaultSystemPrompt.trim();

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
          system_prompt: effectiveSystemPrompt || undefined,
        }),
        signal: controller.signal,
      });

      if (r.status === 401 && retryOn401) {
        const fresh = await recoverFromUnauthorized();
        // null means the session itself is gone -- recoverFromUnauthorized
        // already cleared it, so App.tsx drops back to the login screen.
        if (!fresh) return;
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
                  system_prompt: effectiveSystemPrompt,
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

  const selectedChat = chats?.find((c) => c.id === selectedChatId) ?? null;
  const modelList = models === "unavailable" || models === null ? null : models;
  const lastMessage = messages[messages.length - 1];
  const generating = Boolean(
    lastMessage && (lastMessage.status === "pending" || lastMessage.status === "streaming")
  );

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
    sending,
    error,
    send,
    newChat,
    selectChat,
    generating,
    threadEndRef,
  };
}

export type ChatState = ReturnType<typeof useChat>;
