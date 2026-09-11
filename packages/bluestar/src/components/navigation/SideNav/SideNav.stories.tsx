import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SideNav from "./SideNav";
import Card from "../../layout/Card/Card";
import Text from "../../text/Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Avatar from "../../display/Avatar/Avatar";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import ListRow from "../ListRow/ListRow";
import Button from "../../buttons/Button/Button";

const meta = {
  title: "Navigation/SideNav",
  component: SideNav,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A collapsible left rail for an app's top-level pages, with optional `top`/`footer` slots for an app switcher and account block. Meant for AppShell's `sideNav` slot — this story fakes that layout so the collapse behavior is visible without pulling in AppShell.",
      },
    },
  },
} satisfies Meta<typeof SideNav>;

export default meta;
type Story = StoryObj<typeof SideNav>;

function Demo() {
  const [active, setActive] = useState("playground");
  return (
    <Flexbox style={{ height: "100vh" }}>
      <SideNav
        items={[
          { key: "playground", label: "Playground", icon: "search" },
          { key: "keys", label: "Keys", icon: "settings" },
        ]}
        activeKey={active}
        onSelect={setActive}
        storageKey={null}
      />
      <Flexbox direction="column" grow={1} style={{ padding: 24 }}>
        <Card padding={24}>
          <Text variant="subtitle">Active page: {active}</Text>
        </Card>
      </Flexbox>
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};

function ChromeDemo() {
  const [active, setActive] = useState("playground");
  return (
    <Flexbox style={{ height: "100vh" }}>
      <SideNav
        items={[
          { key: "playground", label: "Playground", icon: "search" },
          { key: "keys", label: "Keys", icon: "settings" },
        ]}
        activeKey={active}
        onSelect={setActive}
        storageKey={null}
        top={
          <Flexbox
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            style={{ padding: "10px 12px" }}
          >
            <Text variant="label">Switch apps</Text>
          </Flexbox>
        }
        footer={
          <Flexbox direction="column" gap={12}>
            <ThemeToggle />
            <Flexbox direction="row" alignItems="center" gap={8}>
              <Avatar name="Ryan Rau" size={32} />
              <Flexbox direction="column">
                <Text variant="label">Ryan Rau</Text>
                <Text variant="caption">ryan@ryanzrau.dev</Text>
              </Flexbox>
            </Flexbox>
          </Flexbox>
        }
      />
      <Flexbox direction="column" grow={1} style={{ padding: 24 }}>
        <Card padding={24}>
          <Text variant="subtitle">Active page: {active}</Text>
        </Card>
      </Flexbox>
    </Flexbox>
  );
}

export const WithChrome: Story = {
  render: () => <ChromeDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "`top` (an app switcher) and `footer` (a theme toggle + account block, pinned above a divider) turn the rail into the app's full chrome — the header carries just the page title.",
      },
    },
  },
};

function ScrollingTopDemo() {
  const [active, setActive] = useState("playground");
  const [selectedRow, setSelectedRow] = useState("row-0");
  const rows = Array.from({ length: 30 }, (_, i) => `row-${i}`);
  return (
    <Flexbox style={{ height: "100vh" }}>
      <SideNav
        items={[
          { key: "playground", label: "Playground", icon: "search" },
          { key: "keys", label: "Keys", icon: "settings" },
        ]}
        activeKey={active}
        onSelect={setActive}
        storageKey={null}
        top={
          <Flexbox direction="column" gap={8}>
            <Flexbox
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              style={{ padding: "2px 12px 0" }}
            >
              <Text variant="label">Chats</Text>
              <Button label="New chat" variant="creation" density="dense" onClick={() => {}} />
            </Flexbox>
            <Flexbox direction="column" gap={4}>
              {rows.map((r, i) => (
                <ListRow
                  key={r}
                  title={`Chat ${i + 1}`}
                  subtitle="2 hours ago"
                  selected={r === selectedRow}
                  onClick={() => setSelectedRow(r)}
                />
              ))}
            </Flexbox>
          </Flexbox>
        }
        footer={
          <Flexbox direction="row" alignItems="center" gap={8}>
            <Avatar name="Ryan Rau" size={32} />
            <Flexbox direction="column">
              <Text variant="label">Ryan Rau</Text>
              <Text variant="caption">ryan@ryanzrau.dev</Text>
            </Flexbox>
          </Flexbox>
        }
      />
      <Flexbox direction="column" grow={1} style={{ padding: 24 }}>
        <Card padding={24}>
          <Text variant="subtitle">Active page: {active}</Text>
        </Card>
      </Flexbox>
    </Flexbox>
  );
}

export const WithScrollingTop: Story = {
  render: () => <ScrollingTopDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "`top` is the region that takes the rail's leftover vertical space and scrolls internally when its own content overflows it, rather than `items` — so an unbounded per-page list (chat history, here) belongs directly in `top` rather than behind a separate drawer. `items` (Playground/Keys) and `footer` (the account block) keep their natural height, pinned just above the bottom regardless of how long the list in `top` gets.",
      },
    },
  },
};
