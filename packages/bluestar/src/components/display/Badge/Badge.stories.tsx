import type { Meta, StoryObj } from "@storybook/react";
import Badge from "./Badge";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Display/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Compact status or count label." },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Outline: Story = {
  render: () => (
    <Flexbox direction="row" gap={8} flexWrap="wrap" alignItems="center">
      <Badge>Draft</Badge>
      <Badge variant="primary">Active</Badge>
      <Badge variant="success">Published</Badge>
      <Badge variant="warning">Review</Badge>
      <Badge variant="error">Failed</Badge>
    </Flexbox>
  ),
  parameters: {
    docs: {
      description: {
        story: "The default — transparent background, colored border and text.",
      },
    },
  },
};

export const Subtle: Story = {
  render: () => (
    <Flexbox direction="row" gap={8} flexWrap="wrap" alignItems="center">
      <Badge emphasis="subtle">Draft</Badge>
      <Badge emphasis="subtle" variant="primary">
        Active
      </Badge>
      <Badge emphasis="subtle" variant="success">
        Published
      </Badge>
      <Badge emphasis="subtle" variant="warning">
        Review
      </Badge>
      <Badge emphasis="subtle" variant="error">
        Failed
      </Badge>
    </Flexbox>
  ),
};

export const Solid: Story = {
  render: () => (
    <Flexbox direction="row" gap={8} flexWrap="wrap" alignItems="center">
      <Badge emphasis="solid">Draft</Badge>
      <Badge emphasis="solid" variant="primary">
        Active
      </Badge>
      <Badge emphasis="solid" variant="success">
        Published
      </Badge>
      <Badge emphasis="solid" variant="warning">
        Review
      </Badge>
      <Badge emphasis="solid" variant="error">
        Failed
      </Badge>
    </Flexbox>
  ),
};
