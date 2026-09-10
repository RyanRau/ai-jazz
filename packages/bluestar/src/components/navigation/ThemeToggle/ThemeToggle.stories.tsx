import type { Meta, StoryObj } from "@storybook/react";
import ThemeToggle from "./ThemeToggle";

const meta = {
  title: "Navigation/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "An Auto/Light/Dark control wired straight to useColorScheme.",
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {
  render: () => <ThemeToggle />,
};
