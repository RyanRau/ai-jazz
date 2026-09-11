import { Button, Card, EmptyState, Flexbox, Header, ListRow } from "bluestar";
import { formatDate } from "./usageHelpers";
import type { ChatState } from "./useChat";

/**
 * The full chat list -- reached via "Show all chats" in SideNav's Chat
 * expandedContent (see ChatHistoryList.tsx), which only ever shows the
 * most recent few. Picking a chat here drops back to the thread view the
 * same way picking one from the nav does.
 */
export function AllChatsPage({ chat }: { chat: ChatState }) {
  const chats = chat.chats ?? [];

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Flexbox justifyContent="space-between" alignItems="center">
          <Header variant="h2">All chats</Header>
          <Button label="New chat" variant="creation" density="dense" onClick={chat.newChat} />
        </Flexbox>
        {chats.length === 0 ? (
          <EmptyState title="No chats yet" description="Start one from the sidebar." />
        ) : (
          <Flexbox direction="column" gap={4}>
            {chats.map((c) => (
              <ListRow
                key={c.id}
                title={c.title}
                subtitle={formatDate(c.updated)}
                selected={false}
                onClick={() => chat.selectChat(c.id)}
              />
            ))}
          </Flexbox>
        )}
      </Flexbox>
    </Card>
  );
}
