import { useEffect, useState } from "react";
import { AppShell, EmptyState, Flexbox, SideNav } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { KeysPage } from "./KeysPage";
import { PlaygroundPage } from "./PlaygroundPage";
import { pb } from "./pb";

type Tab = "playground" | "keys";

function App() {
  const record = useAuthRecord();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("playground");

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
      title="Tony"
      appSwitcher={<AppSwitcher />}
      account={<AccountMenu />}
      sideNav={
        <SideNav
          items={[
            { key: "playground", label: "Playground", icon: "chat" },
            { key: "keys", label: "Keys", icon: "key" },
          ]}
          activeKey={tab}
          onSelect={(key) => setTab(key as Tab)}
        />
      }
    >
      {tab === "playground" && <PlaygroundPage />}
      {tab === "keys" && <KeysPage />}
    </AppShell>
  );
}

export default App;
