import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Modal from "./Modal";
import Button from "../../buttons/Button/Button";
import Text from "../../text/Text/Text";
import TextInput from "../../form/TextInput/TextInput";

const meta = {
  title: "Overlay/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Built on the native `<dialog>` element via `showModal()`, which supplies focus trapping, the top layer, page inertness and Esc-to-close — all fiddly to hand-roll on a div.",
      },
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button label="Open modal" onClick={() => setIsOpen(true)} />
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Edit recipe"
          footer={
            <>
              <Button label="Cancel" variant="secondary" onClick={() => setIsOpen(false)} />
              <Button label="Save" onClick={() => setIsOpen(false)} />
            </>
          }
        >
          <Text variant="subtitle">
            Tab through the fields — focus stays inside the dialog. Esc closes it.
          </Text>
        </Modal>
      </>
    );
  },
};

export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    return (
      <>
        <Button label="Open form modal" onClick={() => setIsOpen(true)} />
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="New collection"
          footer={<Button label="Create" onClick={() => setIsOpen(false)} />}
        >
          <TextInput label="Name" value={name} onChange={setName} placeholder="recipes_entries" />
        </Modal>
      </>
    );
  },
};
