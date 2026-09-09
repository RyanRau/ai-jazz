import { useEffect, useState } from "react";
import { AppShell, Card, EmptyState, Flexbox, Header, Link, Spinner, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { SettingsPage } from "./SettingsPage";
import { AdminPage } from "./AdminPage";
import { pb } from "./pb";

type GrantedApp = { id: string; name: string; url: string; description?: string };

const onSettingsPath = window.location.pathname === "/settings";
const onAdminPath = window.location.pathname === "/admin";

function App() {
  const record = useAuthRecord();
  const [apps, setApps] = useState<GrantedApp[] | null>(null);

  useEffect(() => {
    // Not rendered while signed out (see below), so a stale list here is
    // harmless — no need to reset it back to null on sign-out.
    if (!record || onSettingsPath || onAdminPath) return;
    // Admins see every app in the catalog, not just their own grants —
    // registry_apps' listRule already permits any signed-in user to read
    // the full catalog, so this needs no backend change.
    if (record.is_admin) {
      pb.collection("registry_apps").getFullList<GrantedApp>().then(setApps);
      return;
    }
    pb.collection("registry_grants")
      .getFullList({ expand: "app" })
      .then((grants) => setApps(grants.map((g) => g.expand!.app as GrantedApp)));
  }, [record]);

  if (!record) {
    return (
      <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
        <Card padding={24}>
          <Flexbox direction="column" gap={16}>
            <Header variant="h1">Sign in</Header>
            <LoginForm />
          </Flexbox>
        </Card>
      </Flexbox>
    );
  }

  if (onSettingsPath) {
    return (
      <AppShell
        title="Settings"
        appSwitcher={<AppSwitcher />}
        account={<AccountMenu />}
        maxWidth={640}
      >
        <SettingsPage record={record} />
      </AppShell>
    );
  }

  if (onAdminPath) {
    return (
      <AppShell title="Admin" appSwitcher={<AppSwitcher />} account={<AccountMenu />}>
        {record.is_admin ? (
          <AdminPage />
        ) : (
          <EmptyState
            title="Admin access required"
            description="Ask an admin if you think you should have access to this page."
          />
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title="Apps" appSwitcher={<AppSwitcher />} account={<AccountMenu />}>
      {!apps ? (
        <Spinner />
      ) : apps.length === 0 ? (
        <Text variant="body">No apps have been granted to your account yet — ask the admin.</Text>
      ) : (
        <Flexbox direction="row" flexWrap="wrap" gap={16}>
          {apps.map((a) => (
            <Card key={a.id} padding={20}>
              <Flexbox direction="column" gap={8} style={{ minWidth: 220 }}>
                <Header variant="h3">{a.name}</Header>
                {a.description && <Text variant="body">{a.description}</Text>}
                <Link href={a.url}>Open →</Link>
              </Flexbox>
            </Card>
          ))}
        </Flexbox>
      )}
    </AppShell>
  );
}

export default App;
