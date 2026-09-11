import { Button, Flexbox, ListRow, MenuItem, Text } from "bluestar";
import { formatRelativeTime } from "./usageHelpers";
import type { ChatState } from "./useChat";

// How many recent chats show inline in the nav before "Show all chats"
// takes over -- keep this short, since it's expanding SideNav's own
// natural height (see SideNavItem's `expandedContent` doc), not scrolling
// on its own.
const RECENT_LIMIT = 5;

/**
 * `expandedContent` for the "Chat" item in App.tsx's `SideNav` -- shown
 * indented below it while Chat is the active tab. New chat first (the
 * primary action), then the most recent chats, then a link to the full
 * list (`AllChatsPage`) for anything older.
 */
export function ChatHistoryList({ chat }: { chat: ChatState }) {
  const recent = (chat.chats ?? []).slice(0, RECENT_LIMIT);

  return (
    <Flexbox direction="column" gap={4} style={{ padding: "4px 0 8px" }}>
      <div style={{ padding: "0 4px" }}>
        <Button label="New chat" variant="creation" density="dense" onClick={chat.newChat} />
      </div>
      {chat.chats === null ? (
        <div style={{ padding: "4px 8px" }}>
          <Text variant="caption">Loading…</Text>
        </div>
      ) : chat.chats.length === 0 ? (
        <div style={{ padding: "4px 8px" }}>
          <Text variant="caption">No chats yet.</Text>
        </div>
      ) : (
        <>
          <Flexbox direction="column" gap={4}>
            {recent.map((c) => (
              <ListRow
                key={c.id}
                title={c.title}
                subtitle={formatRelativeTime(c.updated)}
                selected={chat.chatsView === "thread" && c.id === chat.selectedChatId}
                onClick={() => chat.selectChat(c.id)}
              />
            ))}
          </Flexbox>
          <MenuItem
            title={chat.chats.length > RECENT_LIMIT ? "Show all chats" : "All chats"}
            onClick={chat.showAllChats}
          />
        </>
      )}
    </Flexbox>
  );
}
