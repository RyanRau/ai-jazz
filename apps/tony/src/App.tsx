import { useEffect, useState } from "react";
import { AppShell, EmptyState, Flexbox, SideNav } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { GatewayStatus } from "./GatewayStatus";
import { ChatPage } from "./ChatPage";
import { ChatHistoryList } from "./ChatHistoryList";
import { KeysPage } from "./KeysPage";
import { PlaygroundPage } from "./PlaygroundPage";
import { DocsPage } from "./DocsPage";
import { pb } from "./pb";
import { useChat } from "./useChat";

type Tab = "chat" | "playground" | "keys" | "docs";

function App() {
  const record = useAuthRecord();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("playground");
  // Called unconditionally (not just on the Chat tab) so switching tabs and
  // back doesn't lose the draft, the streaming connection, or the selected
  // chat -- SideNav's own chat-history list and ChatPage both read this one
  // instance rather than each keeping a separate copy.
  const chat = useChat();

  useEffect(() => {
    if (!record) return;
    // Distinct requestKey: AppSwitcher fetches from this same endpoint
    // concurrently on this same page, and the PocketBase SDK auto-cancels
    // requests that share a key (by default, method+URL).
    pb.collection("registry_grants")
      .getFullList({ expand: "app", requestKey: "tony-access" })
      .then((grants) =>
        setGranted(
          record.is_admin === true ||
            grants.some((g) => (g.expand?.app as { slug?: string } | undefined)?.slug === "tony")
        )
      );
  }, [record]);

  if (!record) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <LoginForm />
      </Flexbox>
    );
  }

  if (granted === false) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <EmptyState title="No access" description="Ask the admin to grant you the Tony app." />
      </Flexbox>
    );
  }

  if (granted === null) return null;

  return (
    <AppShell
      sideNav={
        <SideNav
          items={[
            { key: "chat", label: "Chat", icon: "chat" },
            { key: "playground", label: "Playground", icon: "search" },
            { key: "keys", label: "Keys", icon: "key" },
            { key: "docs", label: "Docs", icon: "docs" },
          ]}
          activeKey={tab}
          onSelect={(key) => setTab(key as Tab)}
          top={
            <Flexbox direction="column" gap={4}>
              <AppSwitcher appName="Tony" />
              <div style={{ padding: "0 12px" }}>
                <GatewayStatus />
              </div>
              {tab === "chat" && <ChatHistoryList chat={chat} />}
            </Flexbox>
          }
          footer={<AccountMenu />}
        />
      }
    >
      {tab === "chat" && <ChatPage chat={chat} />}
      {tab === "playground" && <PlaygroundPage />}
      {tab === "keys" && <KeysPage />}
      {tab === "docs" && <DocsPage />}
    </AppShell>
  );
}

export default App;
