import type { Meta, StoryObj } from "@storybook/react";
import Breadcrumbs from "./Breadcrumbs";

const meta = {
  title: "Navigation/Breadcrumbs",
  component: Breadcrumbs,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A chevron-separated ancestor trail, ending in the current page as plain text.",
      },
    },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  args: {
    items: [{ label: "mono", href: "#" }, { label: "Apps", href: "#" }, { label: "Recipe Box" }],
  },
};

export const TopLevel: Story = {
  args: {
    items: [{ label: "Apps" }],
  },
  parameters: {
    docs: { description: { story: "A single item — just the current page, no trail." } },
  },
};
