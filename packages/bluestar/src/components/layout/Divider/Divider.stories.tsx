import type { Meta, StoryObj } from "@storybook/react";
import Divider from "./Divider";

const meta = {
  title: "Layout/Divider",
  component: Divider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A thin rule that separates content. Use `direction` to switch between horizontal and vertical, and `length` to control how much of the available space it fills.",
      },
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { direction: "horizontal", length: 100 },
  parameters: {
    docs: { description: { story: "Full-width horizontal rule." } },
  },
};

export const Vertical: Story = {
  decorators: [
    (Story) => (
      <div style={{ display: "flex", height: "80px", alignItems: "stretch" }}>
        <Story />
      </div>
    ),
  ],
  args: { direction: "vertical", length: 100 },
  parameters: {
    docs: {
      description: {
        story: "Full-height vertical rule. Wrap in a flex container to give it height.",
      },
    },
  },
};

export const Partial: Story = {
  args: { direction: "horizontal", length: 50 },
  parameters: {
    docs: { description: { story: "Divider filling 50% of the available width." } },
  },
};
