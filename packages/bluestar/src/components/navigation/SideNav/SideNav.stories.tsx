import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SideNav from "./SideNav";
import Card from "../../layout/Card/Card";
import Text from "../../text/Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Navigation/SideNav",
  component: SideNav,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A collapsible left rail for an app's top-level pages. Meant for AppShell's `sideNav` slot — this story fakes that layout so the collapse behavior is visible without pulling in AppShell.",
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
