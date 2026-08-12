import type { Meta, StoryObj } from "@storybook/react";
import Spinner from "./Spinner";

const meta = {
  title: "Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A circular loading indicator. Size and color are configurable; color falls back to `theme.colors.primary` when omitted.",
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: "Default size (20px) using theme primary color." } },
  },
};

export const Large: Story = {
  args: { size: 40 },
  parameters: {
    docs: { description: { story: "Larger spinner at 40px diameter." } },
  },
};

export const CustomColor: Story = {
  args: { size: 24, color: "var(--bs-color-error)" },
  parameters: {
    docs: { description: { story: "Custom color overriding the theme default." } },
  },
};
