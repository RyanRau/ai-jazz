import type { Meta, StoryObj } from "@storybook/react";
import Meter from "./Meter";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Display/Meter",
  component: Meter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A labeled fill bar for a fixed budget (context window, a quota) -- color shifts primary → warning → error as it fills.",
      },
    },
  },
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof Meter>;

export const Levels: Story = {
  render: () => (
    <Flexbox direction="column" gap={16} style={{ width: 320 }}>
      <Meter label="Context used" value={4200} max={16384} />
      <Meter label="Context used" value={12000} max={16384} />
      <Meter label="Context used" value={15500} max={16384} />
    </Flexbox>
  ),
};
