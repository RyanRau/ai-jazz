import { useState } from "react";
import { css } from "goober";
import {
  Badge,
  Button,
  ChatBubble,
  ConfirmDialog,
  Disclosure,
  Dropdown,
  EmptyState,
  Flexbox,
  Header,
  Icon,
  Link,
  Spinner,
  Text,
  TextAreaInput,
  TextInput,
  useTheme,
} from "bluestar";
import { formatDate, formatMessageTime } from "./usageHelpers";
import { useAuthRecord } from "./useAuth";
import type { ChatState, ChatSummary, ModelInfo } from "./useChat";

// Room for AppShell's own header (~72px) plus main's top/bottom padding
// (48px) plus a little slack for a wrapped nav row -- not pixel-exact, just
// enough that the composer reliably lands at the bottom of the *viewport*
// on a short (or empty) chat instead of floating right under the last
// message, the way a bare `position: sticky` does when there's nothing to
// scroll yet. See the maxWidth wrapper below for how this combines with
// `flex: 1` on the message list to actually push the composer down.
const PAGE_CHROME_HEIGHT = "160px";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * The message box itself -- identical whether it's the prominent, centred
 * box on the empty/greeting state or the bottom-pinned one in an active
 * thread, so both render it rather than keeping two copies in sync.
 */
function Composer({
  draft,
  setDraft,
  onSend,
  canSend,
  sending,
  generating,
  error,
  autoFocus,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
  generating: boolean;
  error: string | null;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  return (
    <Flexbox direction="column" gap={8}>
      <TextAreaInput
        label="Message"
        hideLabel
        description="Enter to send, Shift+Enter for a new line"
        value={draft}
        onChange={setDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        rows={3}
        placeholder="Ask it something"
        isDisabled={sending}
        autoFocus={autoFocus}
      />
      <Flexbox gap={8} alignItems="center">
        <Button label={sending ? "Sending…" : "Send"} onClick={onSend} isDisabled={!canSend} />
        {generating && !sending && (
          <Flexbox gap={4} alignItems="center">
            <Spinner size={14} />
            <Text variant="caption">Still generating…</Text>
          </Flexbox>
        )}
      </Flexbox>
      {error && <Text color={theme.colors.error}>{error}</Text>}
    </Flexbox>
  );
}

/**
 * Fixed-feeling top-of-thread bar: an inline-editable title (click to type,
 * Enter to save, Escape to cancel), an editable model picker (changes what
 * the *next* message in this chat uses -- see useChat's sendWith, which
 * always sends with the chat's own saved model), and delete behind a
 * confirmation. Keyed by chat.id from the parent so switching chats always
 * starts from a clean (non-editing) state rather than carrying over
 * whatever this chat's predecessor was mid-edit.
 */
function ChatHeader({
  chat,
  modelList,
  onRename,
  onModelChange,
  onDeleteRequest,
}: {
  chat: ChatSummary;
  modelList: ModelInfo[] | null;
  onRename: (title: string) => void;
  onModelChange: (model: string) => void;
  onDeleteRequest: () => void;
}) {
  const theme = useTheme();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chat.title);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== chat.title) onRename(trimmed);
    else setTitleDraft(chat.title);
  }

  return (
    <Flexbox
      justifyContent="space-between"
      alignItems="flex-start"
      flexWrap="wrap"
      gap={12}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        backgroundColor: theme.colors.background,
        paddingBottom: 12,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <Flexbox direction="column" gap={4} style={{ minWidth: 0, flex: "1 1 240px" }}>
        {editingTitle ? (
          <TextInput
            label="Chat title"
            hideLabel
            value={titleDraft}
            onChange={setTitleDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setTitleDraft(chat.title);
                setEditingTitle(false);
              }
            }}
            onBlur={commitTitle}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            aria-label={`Rename "${chat.title}"`}
            className={css`
              display: inline-flex;
              align-items: center;
              gap: 6px;
              max-width: 100%;
              background: transparent;
              border: none;
              padding: 2px 4px;
              margin: -2px -4px;
              cursor: pointer;
              border-radius: ${theme.radius.sm};
              &:hover {
                background-color: ${theme.colors.surfaceHover};
              }
              &:focus-visible {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              <Header variant="h2">{chat.title}</Header>
            </div>
            <Icon name="edit" size={14} color={theme.colors.textMuted} />
          </button>
        )}
        <Text variant="caption">Started {formatDate(chat.created)}</Text>
      </Flexbox>

      <Flexbox gap={8} alignItems="center">
        {modelList ? (
          // 260, not some tighter width -- controlClass floors every form
          // control at a 240px min-width, so anything narrower than that
          // just overflows its wrapper and overlaps whatever sits next to
          // it (here, the delete button).
          <div style={{ width: 260 }}>
            <Dropdown
              label="Model"
              hideLabel
              options={modelList.map((m) => ({ label: m.id, value: m.id }))}
              value={chat.model}
              onChange={(v) => v && onModelChange(v)}
            />
          </div>
        ) : (
          <Badge variant="neutral">{chat.model}</Badge>
        )}
        <Button
          label="Delete chat"
          aria-label="Delete chat"
          appearance="text"
          variant="destructive"
          density="dense"
          onClick={onDeleteRequest}
        >
          <Icon name="trash" size={16} />
        </Button>
      </Flexbox>
    </Flexbox>
  );
}

/**
 * The active thread -- chat history itself lives in `SideNav` now (see
 * App.tsx and ChatHistoryList.tsx), so this is just the header, message
 * list, and composer, flowing normally in `AppShell`'s own scrolling `main`
 * rather than locked to its own independently-scrolling height. That
 * matters for more than layout simplicity: a second nested scroll container
 * sized off `100%`/`100vh` is exactly the setup that fights a mobile
 * on-screen keyboard opening (the visual viewport shrinks, the fixed-height
 * container doesn't, and the browser's focus-scroll and this component's
 * own layout math can visibly fight each other) -- one scroll container,
 * with the composer pinned via `position: sticky` and `flex: 1` on the
 * message list pushing it to the bottom even when the thread is short,
 * doesn't have that fight to begin with. Generation is driven by
 * gateway.py's /v1/chat/send as a background task independent of this
 * page's connection (see useChat.ts for the detail), so a message started
 * here keeps going and gets saved even if you close the tab.
 */
export function ChatPage({ chat }: { chat: ChatState }) {
  const theme = useTheme();
  const record = useAuthRecord();
  const {
    apiKey,
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
    renameChat,
    updateChatModel,
    deleteChat,
    generating,
    threadEndRef,
  } = chat;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const canSend = !sending && Boolean(apiKey) && draft.trim().length > 0;

  if (!selectedChat) {
    // No chat started yet -- a big, centred greeting instead of a mostly
    // empty thread view with a composer stuck to the bottom of it. Once the
    // first message actually sends, useChat optimistically sets
    // selectedChatId and this page drops straight into the thread layout
    // below.
    const firstName = (record?.name || record?.email || "").split(" ")[0] || null;
    return (
      <Flexbox
        direction="column"
        alignItems="center"
        justifyContent="center"
        gap={24}
        style={{ minHeight: `calc(100dvh - ${PAGE_CHROME_HEIGHT})`, textAlign: "center" }}
      >
        <Header variant="hero">{firstName ? `Back at it, ${firstName}` : "New chat"}</Header>
        <div style={{ maxWidth: 700, width: "100%" }}>
          <Flexbox direction="column" gap={12}>
            <Composer
              draft={draft}
              setDraft={setDraft}
              onSend={send}
              canSend={canSend}
              sending={sending}
              generating={generating}
              error={error}
              autoFocus
            />
            {modelList && (
              <div style={{ width: 260, maxWidth: "100%", margin: "0 auto" }}>
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
            )}
          </Flexbox>
        </div>
      </Flexbox>
    );
  }

  return (
    <Flexbox
      direction="column"
      gap={16}
      style={{ minHeight: `calc(100dvh - ${PAGE_CHROME_HEIGHT})` }}
    >
      <ChatHeader
        key={selectedChat.id}
        chat={selectedChat}
        modelList={modelList}
        onRename={(title) => renameChat(selectedChat.id, title)}
        onModelChange={(m) => updateChatModel(selectedChat.id, m)}
        onDeleteRequest={() => setConfirmingDelete(true)}
      />

      {/* The thread reads better as a comfortable column even in a
          full-width shell -- a chat feed and composer stretched edge to
          edge is uncomfortable to read/type in, unlike Playground's
          side-by-side panels or Keys' tables, which actually want the
          extra width. Just this inner region (messages + composer) is
          capped; the header above stays pinned to the shell's own
          full-width edges. `flex: 1` + `display: flex; flex-direction:
          column` here (and on the message Flexbox below) is what lets the
          composer sit at the true bottom of the viewport even for a short
          or empty thread, rather than only "sticking" once there's enough
          content to scroll. */}
      <div
        style={{
          maxWidth: 840,
          width: "100%",
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Flexbox direction="column" gap={12} style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <EmptyState title="No messages" description="Send a message below to begin." />
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
          <Composer
            draft={draft}
            setDraft={setDraft}
            onSend={send}
            canSend={canSend}
            sending={sending}
            generating={generating}
            error={error}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteChat(selectedChat.id)}
        title="Delete chat?"
        message={`"${selectedChat.title}" and all its messages will be permanently deleted.`}
        confirmLabel="Delete"
      />
    </Flexbox>
  );
}
