import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Tabs from "./Tabs";
import Text from "../../text/Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A flat, underline-selected tab row for switching views within a page.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

function Demo() {
  const [active, setActive] = useState("overview");
  return (
    <Flexbox direction="column" gap={16}>
      <Tabs
        items={[
          { key: "overview", label: "Overview" },
          { key: "apps", label: "Apps", icon: "search" },
          { key: "settings", label: "Settings", icon: "settings" },
        ]}
        activeKey={active}
        onSelect={setActive}
      />
      <Text variant="subtitle">Active tab: {active}</Text>
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
