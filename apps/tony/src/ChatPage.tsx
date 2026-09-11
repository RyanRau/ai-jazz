import { useState } from "react";
import { css } from "goober";
import {
  Badge,
  Button,
  ChatBubble,
  Disclosure,
  Dropdown,
  EmptyState,
  Flexbox,
  Header,
  Link,
  Spinner,
  Text,
  TextAreaInput,
  useTheme,
} from "bluestar";
import { formatDate, formatMessageTime } from "./usageHelpers";
import type { ChatState } from "./useChat";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Edits one chat's system prompt -- `key={chat.id}` at the call site resets
 * this back to `initial` on every chat switch rather than needing a sync
 * effect. Saving takes effect on the chat's next turn (see gateway.py's
 * effective_system_prompt), not retroactively. */
function SystemPromptEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flexbox direction="column" gap={8}>
      <TextAreaInput
        label="System prompt"
        value={value}
        onChange={setValue}
        rows={3}
        placeholder="None set for this chat"
      />
      <Flexbox>
        <Button
          label={saving ? "Saving…" : "Save"}
          onClick={save}
          isDisabled={saving || value === initial}
          density="dense"
        />
      </Flexbox>
    </Flexbox>
  );
}

/**
 * The active thread -- chat history itself lives in `SideNav` now (see
 * App.tsx and ChatHistoryList.tsx), so this is just the message list and
 * composer, flowing normally in `AppShell`'s own scrolling `main` rather
 * than locked to its own independently-scrolling height. That matters for
 * more than layout simplicity: a second nested scroll container sized off
 * `100%`/`100vh` is exactly the setup that fights a mobile on-screen
 * keyboard opening (the visual viewport shrinks, the fixed-height container
 * doesn't, and the browser's focus-scroll and this component's own layout
 * math can visibly fight each other) -- one scroll container, with the
 * composer pinned via `position: sticky`, doesn't have that fight to begin
 * with. Generation is driven by gateway.py's /v1/chat/send as a background
 * task independent of this page's connection (see useChat.ts for the
 * detail), so a message started here keeps going and gets saved even if you
 * close the tab.
 */
export function ChatPage({ chat }: { chat: ChatState }) {
  const theme = useTheme();
  const {
    apiKey,
    modelList,
    model,
    setModel,
    systemPromptDraft,
    setSystemPromptDraft,
    defaultSystemPrompt,
    updateChatSystemPrompt,
    selectedChat,
    messages,
    draft,
    setDraft,
    sending,
    error,
    send,
    generating,
    threadEndRef,
  } = chat;

  return (
    <Flexbox direction="column" gap={16}>
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
            <Flexbox direction="column" gap={8} style={{ width: 240, maxWidth: "100%" }}>
              <Dropdown
                label="Model"
                options={[
                  { label: "Gateway default", value: "" },
                  ...modelList.map((m) => ({ label: m.id, value: m.id })),
                ]}
                value={model}
                onChange={(v) => setModel(v ?? "")}
              />
              <TextAreaInput
                label="System prompt (optional)"
                value={systemPromptDraft}
                onChange={setSystemPromptDraft}
                rows={2}
                placeholder={
                  defaultSystemPrompt ? "Falls back to your default" : "None -- see Keys page"
                }
              />
            </Flexbox>
          ) : null)}
      </Flexbox>

      {selectedChat && (
        <Disclosure
          label={selectedChat.system_prompt ? "System prompt" : "System prompt (none set)"}
        >
          <SystemPromptEditor
            key={selectedChat.id}
            initial={selectedChat.system_prompt}
            onSave={(value) => updateChatSystemPrompt(selectedChat.id, value)}
          />
        </Disclosure>
      )}

      <Flexbox direction="column" gap={12}>
        {messages.length === 0 ? (
          <EmptyState
            title={selectedChat ? "No messages" : "Start a new chat"}
            description="Send a message below to begin."
          />
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user";
            const meta = [
              formatMessageTime(m.created),
              m.role === "assistant" &&
                m.status === "complete" &&
                m.tokens_in > 0 &&
                `${m.tokens_in.toLocaleString()} in`,
              m.role === "assistant" &&
                m.status === "complete" &&
                m.tokens_out > 0 &&
                `${m.tokens_out.toLocaleString()} out`,
              m.role === "assistant" &&
                m.status === "complete" &&
                m.response_ms > 0 &&
                formatElapsed(m.response_ms),
            ]
              .filter(Boolean)
              .join(" · ");
            const toolCount = m.tool_calls.length;

            return (
              <Flexbox key={m.id} direction="column" gap={4}>
                <ChatBubble role={m.role} content={m.content} status={m.status} />
                {meta && (
                  <Flexbox justifyContent={isUser ? "flex-end" : "flex-start"}>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {meta}
                    </Text>
                  </Flexbox>
                )}
                {toolCount > 0 && (
                  <Disclosure label={`${toolCount} tool${toolCount === 1 ? "" : "s"} used`}>
                    <Flexbox direction="column" gap={8}>
                      {m.tool_calls.map((tc, i) =>
                        tc.type === "fetch_url" ? (
                          <Flexbox key={i} direction="column" gap={4}>
                            <Flexbox direction="row" gap={4} alignItems="center" flexWrap="wrap">
                              <Text variant="caption">Read link:</Text>
                              <Link href={tc.url} external variant="muted">
                                <Text variant="caption">{tc.title || tc.url}</Text>
                              </Link>
                            </Flexbox>
                            {tc.error && <Text variant="caption">{tc.error}</Text>}
                          </Flexbox>
                        ) : (
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
                        )
                      )}
                    </Flexbox>
                  </Disclosure>
                )}
              </Flexbox>
            );
          })
        )}
        <div ref={threadEndRef} />
      </Flexbox>

      <div
        className={css`
          position: sticky;
          bottom: 0;
          background-color: ${theme.colors.background};
          border-top: 1px solid ${theme.colors.border};
          padding-top: 12px;
        `}
      >
        <Flexbox direction="column" gap={8}>
          <TextAreaInput
            label="Message"
            description="Enter to send, Shift+Enter for a new line"
            value={draft}
            onChange={setDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending && apiKey && draft.trim()) send();
              }
            }}
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
          {error && <Text color={theme.colors.error}>{error}</Text>}
        </Flexbox>
      </div>
    </Flexbox>
  );
}
