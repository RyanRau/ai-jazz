import { useState } from "react";
import { Button, Card, Flexbox, Header, Modal, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { signOut } from "./pb";
import { LoginForm } from "./LoginForm";

function App() {
  const record = useAuthRecord();
  const [loginOpen, setLoginOpen] = useState(false);

  if (record) {
    return (
      <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
        <Card padding={24}>
          <Flexbox direction="column" gap={12}>
            <Header variant="h1">Welcome back, {record.email}</Header>
            <Text variant="body">Signed in across every ryanzrau.dev app.</Text>
            <Button label="Log out" variant="secondary" onClick={signOut} />
          </Flexbox>
        </Card>
      </Flexbox>
    );
  }

  return (
    <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
      <Card padding={24}>
        <Flexbox direction="column" gap={8}>
          <Header variant="h1">Ryan Rau</Header>
          <Text variant="body">
            Resume content — coming soon. Signing in unlocks the dashboard and its apps.
          </Text>
          <Button label="Sign in" variant="secondary" onClick={() => setLoginOpen(true)} />
        </Flexbox>
      </Card>

      <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Sign in">
        <LoginForm onSuccess={() => setLoginOpen(false)} />
      </Modal>
    </Flexbox>
  );
}

export default App;
