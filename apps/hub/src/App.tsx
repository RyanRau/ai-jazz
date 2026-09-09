import { useEffect, useState } from "react";
import { AppShell, Button, Card, Flexbox, Header, Link, Spinner, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { pb, signOut } from "./pb";

type GrantedApp = { id: string; name: string; url: string; description?: string };

function App() {
  const record = useAuthRecord();
  const [apps, setApps] = useState<GrantedApp[] | null>(null);

  useEffect(() => {
    // Not rendered while signed out (see below), so a stale list here is
    // harmless — no need to reset it back to null on sign-out.
    if (!record) return;
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

  return (
    <AppShell
      title="Apps"
      nav={<Button label="Log out" variant="secondary" density="dense" onClick={signOut} />}
    >
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
