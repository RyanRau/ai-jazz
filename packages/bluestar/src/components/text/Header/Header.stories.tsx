import type { Meta, StoryObj } from "@storybook/react";
import Header from "./Header";

const meta = {
  title: "Text/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Heading text component. Renders the correct semantic HTML element (`h1`–`h3`) and scales font size and weight automatically based on the `variant` prop.",
      },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof Header>;

export const H1: Story = {
  args: { variant: "h1", children: "Heading 1" },
  parameters: {
    docs: { description: { story: "Largest heading — 28px, weight 800." } },
  },
};

export const H2: Story = {
  args: { variant: "h2", children: "Heading 2" },
  parameters: {
    docs: { description: { story: "20px, weight 700." } },
  },
};

export const H3: Story = {
  args: { variant: "h3", children: "Heading 3" },
  parameters: {
    docs: { description: { story: "16px, weight 700." } },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Header variant="h1">Heading 1</Header>
      <Header variant="h2">Heading 2</Header>
      <Header variant="h3">Heading 3</Header>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "All three variants rendered together for comparison." },
    },
  },
};
