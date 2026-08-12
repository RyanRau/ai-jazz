import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ConfirmDialog from "./ConfirmDialog";
import Button from "../../buttons/Button/Button";
import Text from "../../text/Text/Text";

const meta = {
  title: "Overlay/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A yes/no gate before something irreversible. `onConfirm` may be async — the confirm button spins until it settles, then the dialog closes.",
      },
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Destructive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [deleted, setDeleted] = useState(false);

    return (
      <>
        <Button label="Delete recipe" variant="destructive" onClick={() => setIsOpen(true)} />
        {deleted && <Text variant="caption">Deleted.</Text>}
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 900));
            setDeleted(true);
          }}
          title="Delete this recipe?"
          message="This removes the record and its uploaded images. It can't be undone."
          confirmLabel="Delete"
        />
      </>
    );
  },
};
