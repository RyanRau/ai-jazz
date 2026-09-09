import type { Meta, StoryObj } from "@storybook/react";
import StatTile from "./StatTile";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Display/StatTile",
  component: StatTile,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A single headline number: label, then a large proportional-figure value.",
      },
    },
  },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof StatTile>;

export const Row: Story = {
  render: () => (
    <Flexbox direction="row" gap={16}>
      <StatTile label="Total calls" value="1,284" />
      <StatTile label="Tokens in" value="482.3K" />
      <StatTile label="Tokens out" value="915.7K" />
    </Flexbox>
  ),
};
