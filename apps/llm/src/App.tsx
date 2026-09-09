import { useEffect, useState } from "react";
import { AppShell, Card, EmptyState, Flexbox, Header, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { pb } from "./pb";

function App() {
  const record = useAuthRecord();
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!record) return;
    pb.collection("registry_grants")
      .getFullList({ expand: "app" })
      .then((grants) =>
        setGranted(
          grants.some((g) => (g.expand?.app as { slug?: string } | undefined)?.slug === "llm")
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
        <EmptyState title="No access" description="Ask the admin to grant you the LLM app." />
      </Flexbox>
    );
  }

  if (granted === null) return null;

  return (
    <AppShell title="LLM" account={<AccountMenu />}>
      <Card padding={24}>
        <Flexbox direction="column" gap={8}>
          <Header variant="h2">Coming soon</Header>
          <Text variant="body">
            Key management and a chat interface for the home-lab LLM, once network access and key
            format are sorted out.
          </Text>
        </Flexbox>
      </Card>
    </AppShell>
  );
}

export default App;
