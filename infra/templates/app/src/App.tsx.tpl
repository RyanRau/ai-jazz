import { AppShell, Card, Flexbox, Header, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";

function App() {
  const record = useAuthRecord();

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
    <AppShell title="__TITLE__" account={<AccountMenu />}>
      <Card padding={24}>
        <Flexbox direction="column" gap={8}>
          <Header variant="h1">__TITLE__</Header>
          <Text variant="body">
            Scaffolded by infra/new_app.py. Build the UI from bluestar components (see
            packages/PACKAGES.md) and talk to the shared backend through src/pb.ts.
          </Text>
        </Flexbox>
      </Card>
    </AppShell>
  );
}

export default App;
