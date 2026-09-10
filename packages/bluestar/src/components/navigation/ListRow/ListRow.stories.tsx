import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ListRow from "./ListRow";
import Badge from "../../display/Badge/Badge";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Navigation/ListRow",
  component: ListRow,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "One row in a selectable master-detail list — an API key list, a chat list.",
      },
    },
  },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof ListRow>;

function Demo() {
  const [selected, setSelected] = useState("prod");
  return (
    <Flexbox direction="column" gap={4} style={{ width: 240 }}>
      <ListRow
        title="Production"
        subtitle="ryan@ryanzrau.dev"
        badge={<Badge variant="neutral">Default</Badge>}
        selected={selected === "prod"}
        onClick={() => setSelected("prod")}
      />
      <ListRow
        title="Staging"
        subtitle="2h ago"
        selected={selected === "staging"}
        onClick={() => setSelected("staging")}
      />
      <ListRow
        title="Old laptop key"
        muted
        selected={selected === "old"}
        onClick={() => setSelected("old")}
      />
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
