import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Alert from "./Alert";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Button from "../../buttons/Button/Button";

const meta = {
  title: "Feedback/Alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Inline message. Backgrounds are mixed from the tone's colour with `color-mix`, so they re-tint themselves in dark mode with no extra tokens.",
      },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof Alert>;

export const AllTones: Story = {
  render: () => (
    <Flexbox direction="column" gap={12}>
      <Alert variant="info">Migrations run automatically on deploy.</Alert>
      <Alert variant="success" title="Saved">
        Your changes are live.
      </Alert>
      <Alert variant="warning" title="Heads up">
        This collection has no access rules set.
      </Alert>
      <Alert variant="error" title="Couldn't save">
        The record was modified by someone else.
      </Alert>
    </Flexbox>
  ),
};

export const Dismissible: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    return visible ? (
      <Alert variant="info" title="Dismissible" onDismiss={() => setVisible(false)}>
        Providing `onDismiss` renders the close button.
      </Alert>
    ) : (
      <Button label="Show again" onClick={() => setVisible(true)} />
    );
  },
};
