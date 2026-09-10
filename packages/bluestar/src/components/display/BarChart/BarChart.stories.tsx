import type { Meta, StoryObj } from "@storybook/react";
import BarChart from "./BarChart";

const DAYS = Array.from({ length: 14 }, (_, i) => `9/${i + 1}`);

const meta = {
  title: "Display/BarChart",
  component: BarChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Multi-series grouped bar chart -- LineChart's daily-comparison sibling, same props shape, legend, hover+tooltip, and table-view toggle. All series share one y-axis -- never a dual scale.",
      },
    },
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof BarChart>;

// Validated categorical pair (dataviz skill, slots 1/2 -- blue/orange), not
// eyeballed: node scripts/validate_palette.js "#2a78d6,#eb6834" --mode light
// and --mode dark both pass every check against bluestar's real surfaces.
export const TokensInOut: Story = {
  render: () => (
    <BarChart
      series={[
        {
          key: "in",
          label: "Tokens in",
          color: "#2a78d6",
          points: DAYS.map((x, i) => ({ x, y: Math.round(200 + i * 40 + Math.sin(i) * 80) })),
        },
        {
          key: "out",
          label: "Tokens out",
          color: "#eb6834",
          points: DAYS.map((x, i) => ({ x, y: Math.round(400 + i * 60 + Math.cos(i) * 120) })),
        },
      ]}
    />
  ),
};
