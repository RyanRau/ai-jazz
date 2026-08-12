import type { Meta, StoryObj } from "@storybook/react";
import Skeleton from "./Skeleton";
import Card from "../../layout/Card/Card";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Placeholder shown while content loads. Prefer it to a centred spinner when you know the shape of what's coming.",
      },
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const SingleBar: Story = {
  render: () => <Skeleton width={240} />,
};

export const Paragraph: Story = {
  render: () => <Skeleton lines={4} />,
  parameters: {
    docs: {
      description: { story: "The last line is shortened so a block reads as text." },
    },
  },
};

export const CardPlaceholder: Story = {
  render: () => (
    <Card padding={16}>
      <Flexbox direction="row" gap={12} alignItems="center">
        <Skeleton circle width={40} />
        <Flexbox direction="column" gap={8} grow={1}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="80%" height={12} />
        </Flexbox>
      </Flexbox>
    </Card>
  ),
};
