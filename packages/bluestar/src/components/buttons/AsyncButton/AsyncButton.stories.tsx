import type { Meta, StoryObj } from "@storybook/react";
import AsyncButton from "./AsyncButton";

const meta = {
  title: "Buttons/AsyncButton",
  component: AsyncButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A button that handles async `onClick` handlers. While the promise is pending the button is disabled and a spinner appears to the right of the label.",
      },
    },
  },
} satisfies Meta<typeof AsyncButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Submit",
    onClick: () => new Promise((resolve) => setTimeout(resolve, 2000)),
  },
  parameters: {
    docs: {
      description: { story: "Click to see the spinner appear while loading." },
    },
  },
};

export const LongTask: Story = {
  args: {
    label: "Upload",
    onClick: () => new Promise((resolve) => setTimeout(resolve, 4000)),
  },
  parameters: {
    docs: {
      description: { story: "Same behaviour with a 4 second task." },
    },
  },
};

export const Outline: Story = {
  args: {
    label: "Redeploy",
    appearance: "outline",
    onClick: () => new Promise((resolve) => setTimeout(resolve, 2000)),
  },
  parameters: {
    docs: {
      description: {
        story: "The label and spinner match the accent color, not `textOnAccent`, on non-solid appearances.",
      },
    },
  },
};
