import type { Meta, StoryObj } from "@storybook/react";
import EmptyState from "./EmptyState";
import Button from "../../buttons/Button/Button";
import Card from "../../layout/Card/Card";

const meta = {
  title: "Feedback/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'What a list shows before it has anything in it. Name the missing thing rather than saying "No data".',
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const WithAction: Story = {
  render: () => (
    <Card padding={16}>
      <EmptyState
        icon="🍲"
        title="No recipes yet"
        description="Add your first recipe and it'll show up here."
        action={<Button label="Add recipe" onClick={() => {}} />}
      />
    </Card>
  ),
};

export const Minimal: Story = {
  render: () => <EmptyState title="Nothing matched that search" />,
};
