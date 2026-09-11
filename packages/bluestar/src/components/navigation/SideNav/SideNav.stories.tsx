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

function ExpandedContentDemo() {
  const [active, setActive] = useState("chat");
  const [selectedChat, setSelectedChat] = useState("chat-0");
  const recentChats = ["Trip planning", "Recipe ideas", "Debugging notes"];
  return (
    <Flexbox style={{ height: "100vh" }}>
      <SideNav
        items={[
          {
            key: "chat",
            label: "Chat",
            icon: "chat",
            expandedContent: (
              <Flexbox direction="column" gap={4} style={{ padding: "4px 0" }}>
                <Button label="New chat" variant="creation" density="dense" onClick={() => {}} />
                {recentChats.map((title, i) => (
                  <ListRow
                    key={title}
                    title={title}
                    subtitle="2 hours ago"
                    selected={`chat-${i}` === selectedChat}
                    onClick={() => setSelectedChat(`chat-${i}`)}
                  />
                ))}
                <Text variant="caption" color="var(--bs-color-primary)">
                  Show all chats →
                </Text>
              </Flexbox>
            ),
          },
          { key: "playground", label: "Playground", icon: "search" },
          { key: "keys", label: "Keys", icon: "settings" },
        ]}
        activeKey={active}
        onSelect={setActive}
        storageKey={null}
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

export const WithExpandedContent: Story = {
  render: () => <ExpandedContentDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "An item's `expandedContent` renders indented directly below it while it's the active one — a short sub-section (a page's own top few things to jump to) rather than a whole second panel. `items` still keeps its natural top-aligned position, with `footer` pinned to the bottom; a long list belongs on its own page (linked from here, e.g. \"Show all chats\") rather than trying to make this scroll on its own.",
      },
    },
  },
};
