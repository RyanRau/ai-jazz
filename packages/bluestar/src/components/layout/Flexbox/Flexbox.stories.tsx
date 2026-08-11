import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
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
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "16px 24px",
        background: "#7da7d9",
        color: "#fff",
        borderRadius: "4px",
      },
    },
    children
  );

export const Row: Story = {
  args: {
    direction: "row",
    gap: 16,
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "One"),
      React.createElement(Box, { key: "2" }, "Two"),
      React.createElement(Box, { key: "3" }, "Three"),
    ]),
  parameters: {
    docs: { description: { story: "Horizontal layout with a 16px gap between items." } },
  },
};

export const Column: Story = {
  args: {
    direction: "column",
    gap: 12,
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "One"),
      React.createElement(Box, { key: "2" }, "Two"),
      React.createElement(Box, { key: "3" }, "Three"),
    ]),
  parameters: {
    docs: { description: { story: "Vertical stack with a 12px gap." } },
  },
};

export const SpaceBetween: Story = {
  args: {
    direction: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "Left"),
      React.createElement(Box, { key: "2" }, "Right"),
    ]),
  parameters: {
    docs: {
      description: {
        story: "Items pushed to opposite ends with `justify-content: space-between`.",
      },
    },
  },
};

export const CenterAligned: Story = {
  args: {
    direction: "row",
    gap: 16,
    alignItems: "center",
    height: 120,
  },
  render: (args) =>
    React.createElement(Flexbox, { ...args, style: { border: "1px dashed #ccc" } }, [
      React.createElement(Box, { key: "1" }, "Short"),
      React.createElement(
        "div",
        {
          key: "2",
          style: {
            padding: "32px 24px",
            background: "#7da7d9",
            color: "#fff",
            borderRadius: "4px",
          },
        },
        "Tall"
      ),
      React.createElement(Box, { key: "3" }, "Short"),
    ]),
  parameters: {
    docs: {
      description: {
        story: "Items of different heights vertically centered via `align-items: center`.",
      },
    },
  },
};
