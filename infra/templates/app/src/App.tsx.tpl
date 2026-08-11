import { Card, Flexbox, Header, Text } from "bluestar";

function App() {
  return (
    <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
      <Card padding={24}>
        <Flexbox direction="column" gap={8}>
          <Header variant="h1">__TITLE__</Header>
          <Text variant="body">
            Scaffolded by infra/new_app.py. Build the UI from bluestar components (see
            packages/PACKAGES.md) and talk to the shared backend through src/pb.ts.
          </Text>
        </Flexbox>
      </Card>
    </Flexbox>
  );
}

export default App;
