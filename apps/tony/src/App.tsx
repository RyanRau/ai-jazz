import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, Flexbox } from "bluestar";
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
    pb.collection("registry_grants")
      .getFullList({ expand: "app" })
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
    <AppShell title="Tony" appSwitcher={<AppSwitcher />} account={<AccountMenu />}>
      <Flexbox gap={24}>
        <Flexbox direction="column" gap={4} style={{ width: 160, flexShrink: 0 }}>
          <Button
            label="Playground"
            variant={tab === "playground" ? "primary" : "secondary"}
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => setTab("playground")}
          />
          <Button
            label="Keys"
            variant={tab === "keys" ? "primary" : "secondary"}
            style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => setTab("keys")}
          />
        </Flexbox>
        <Flexbox direction="column" grow={1} style={{ minWidth: 0 }}>
          {tab === "playground" ? <PlaygroundPage /> : <KeysPage />}
        </Flexbox>
      </Flexbox>
    </AppShell>
  );
}

export default App;
