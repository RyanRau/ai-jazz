import type { Meta, StoryObj } from "@storybook/react";
import Tooltip from "./Tooltip";
import Button from "../../buttons/Button/Button";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Overlay/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A small inverted-color label shown on hover or keyboard focus.",
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Flexbox gap={32} style={{ padding: 48 }}>
      <Tooltip content="Redeploy this app">
        <Button label="Redeploy" appearance="outline" />
      </Tooltip>
      <Tooltip content="Shown below the trigger instead" placement="bottom">
        <Button label="Bottom placement" appearance="text" />
      </Tooltip>
    </Flexbox>
  ),
};
