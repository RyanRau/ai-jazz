import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SegmentedControl from "./SegmentedControl";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Buttons/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A dense toggle group for picking one of a small set of views.",
      },
    },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

function Demo() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  return (
    <Flexbox gap={16}>
      <SegmentedControl
        options={[
          { label: "7d", value: "7d" },
          { label: "30d", value: "30d" },
          { label: "90d", value: "90d" },
          { label: "All", value: "all" },
        ]}
        value={range}
        onChange={setRange}
      />
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
