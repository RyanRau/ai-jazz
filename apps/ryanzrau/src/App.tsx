import { useState } from "react";
import { AppShell, Button, Card, Flexbox, Header, Modal, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";

function App() {
  const record = useAuthRecord();
  const [loginOpen, setLoginOpen] = useState(false);

  if (record) {
    return (
      <AppShell title="Ryan Rau" account={<AccountMenu />}>
        <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
          <Card padding={24}>
            <Flexbox direction="column" gap={12}>
              <Header variant="h1">Welcome back, {record.email}</Header>
              <Text variant="body">Signed in across every ryanzrau.dev app.</Text>
            </Flexbox>
          </Card>
        </Flexbox>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Ryan Rau"
      account={
        <Button
          label="Sign in"
          variant="secondary"
          density="dense"
          onClick={() => setLoginOpen(true)}
        />
      }
    >
      <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
        <Card padding={24}>
          <Flexbox direction="column" gap={8}>
            <Header variant="h1">Ryan Rau</Header>
            <Text variant="body">
              Welcome! This is Ryan Rau's site. Sign in to reach the dashboard and its apps.
            </Text>
          </Flexbox>
        </Card>
      </Flexbox>

      <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Sign in">
        <LoginForm onSuccess={() => setLoginOpen(false)} />
      </Modal>
    </AppShell>
  );
}

export default App;
