import { css } from "goober";
import {
  Badge,
  Button,
  ChatBubble,
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
import { formatDate } from "./usageHelpers";
import type { ChatState } from "./useChat";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
    keyError,
    modelList,
    model,
    setModel,
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

      <Flexbox direction="column" gap={12}>
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
      </div>
    </Flexbox>
  );
}
