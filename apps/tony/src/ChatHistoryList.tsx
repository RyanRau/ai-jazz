import { Button, Flexbox, ListRow, Text } from "bluestar";
import { formatDate } from "./usageHelpers";
import type { ChatState } from "./useChat";

/**
 * The chat-history list, rendered inside `SideNav`'s `top` slot (see
 * App.tsx) rather than as a separate panel inside `ChatPage` -- `top` is
 * the region of the rail that takes leftover vertical space and scrolls
 * internally (see SideNav.tsx), so a long list belongs there directly
 * instead of behind a second, page-level drawer.
 */
export function ChatHistoryList({ chat }: { chat: ChatState }) {
  return (
    <Flexbox direction="column" gap={8} style={{ padding: "4px 4px 8px" }}>
      <Flexbox justifyContent="space-between" alignItems="center">
        <Text variant="label">Chats</Text>
        <Button label="New chat" variant="creation" density="dense" onClick={chat.newChat} />
      </Flexbox>
      {chat.chats === null || chat.chats.length === 0 ? (
        <Text variant="caption">{chat.chats === null ? "Loading…" : "No chats yet."}</Text>
      ) : (
        <Flexbox direction="column" gap={4}>
          {chat.chats.map((c) => (
            <ListRow
              key={c.id}
              title={c.title}
              subtitle={formatDate(c.updated)}
              selected={c.id === chat.selectedChatId}
              onClick={() => chat.selectChat(c.id)}
            />
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
}
