import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { css } from "goober";
import Flexbox from "./Flexbox";

const meta = {
  title: "Layout/Flexbox",
  component: Flexbox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A layout wrapper that maps props directly to CSS flexbox properties. All props are optional and map 1:1 to their CSS equivalents.",
      },
    },
  },
} satisfies Meta<typeof Flexbox>;

export default meta;
type Story = StoryObj<typeof Flexbox>;

const Box = ({ children }: { children: ReactNode }) => (
  <div
    className={css`
      padding: 16px 24px;
      background: var(--bs-color-primary);
      color: var(--bs-color-text-on-accent);
      border-radius: var(--bs-radius-sm);
    `}
  >
    {children}
  </div>
);

const boxes = (
  <>
    <Box>One</Box>
    <Box>Two</Box>
    <Box>Three</Box>
  </>
);

export const Row: Story = {
  render: () => (
    <Flexbox direction="row" gap={16}>
      {boxes}
    </Flexbox>
  ),
  parameters: {
    docs: { description: { story: "Horizontal layout with a 16px gap between items." } },
  },
};

export const Column: Story = {
  render: () => (
    <Flexbox direction="column" gap={12}>
      {boxes}
    </Flexbox>
  ),
  parameters: {
    docs: { description: { story: "Vertical layout with a 12px gap between items." } },
  },
};

export const SpaceBetween: Story = {
  render: () => (
    <Flexbox direction="row" justifyContent="space-between" width="100%">
      {boxes}
    </Flexbox>
  ),
  parameters: {
    docs: {
      description: { story: "Items pushed to the edges with the space distributed between." },
    },
  },
};

export const Centered: Story = {
  render: () => (
    <Flexbox direction="row" justifyContent="center" alignItems="center" gap={8} height={160}>
      {boxes}
    </Flexbox>
  ),
  parameters: {
    docs: { description: { story: "Centred on both axes inside a fixed-height container." } },
  },
};

export const Wrapping: Story = {
  render: () => (
    <Flexbox direction="row" gap={8} flexWrap="wrap" width={280}>
      {boxes}
      {boxes}
    </Flexbox>
  ),
  parameters: {
    docs: { description: { story: "Wraps onto a new line when the container runs out of room." } },
  },
};
