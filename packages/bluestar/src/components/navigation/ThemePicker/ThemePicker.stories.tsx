import type { Meta, StoryObj } from "@storybook/react";
import ThemePicker from "./ThemePicker";

const meta = {
  title: "Navigation/ThemePicker",
  component: ThemePicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A palette-icon button opening a modal for Auto/Light/Dark plus a custom accent color. Click the icon to open it.",
      },
    },
  },
} satisfies Meta<typeof ThemePicker>;

export default meta;
type Story = StoryObj<typeof ThemePicker>;

export const Default: Story = {
  render: () => <ThemePicker />,
};
