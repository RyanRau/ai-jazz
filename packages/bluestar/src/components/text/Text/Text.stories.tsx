import type { Meta, StoryObj } from "@storybook/react";
import Text from "./Text";

const meta = {
  title: "Text/Text",
  component: Text,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Body text component. The `variant` maps to a theme-defined text type that controls size, weight, style, and color. Always renders as a `<p>` element.",
      },
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof Text>;

export const Subtitle: Story = {
  args: { variant: "subtitle", children: "Subtitle — default body size (14px)." },
  parameters: {
    docs: { description: { story: "Default variant. Standard UI body copy." } },
  },
};

export const Caption: Story = {
  args: { variant: "caption", children: "Caption — small and muted (10px)." },
  parameters: {
    docs: {
      description: { story: "Smallest type. Muted color. Use for labels, timestamps, and hints." },
    },
  },
};

export const Body: Story = {
  args: { variant: "body", children: "Body — compact body copy (12px)." },
  parameters: {
    docs: { description: { story: "Compact body text. Slightly smaller than subtitle." } },
  },
};

export const Display: Story = {
  args: { variant: "display", children: "Display — emphasized text (18px)." },
  parameters: {
    docs: { description: { story: "Bold. Use for callouts or emphasized non-semantic text." } },
  },
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Text variant="display">Display — emphasized text</Text>
      <Text variant="subtitle">Subtitle — default body</Text>
      <Text variant="body">Body — compact copy</Text>
      <Text variant="caption">Caption — small and muted</Text>
    </div>
  ),
  parameters: {
    docs: { description: { story: "All text types from largest to smallest." } },
  },
};
