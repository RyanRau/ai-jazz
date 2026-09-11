import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Drawer from "./Drawer";
import Button from "../../buttons/Button/Button";
import ListRow from "../../navigation/ListRow/ListRow";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Overlay/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A full-height panel flush against a viewport edge, for a secondary list (chat history, a filter rail) that should float above the page on a narrow viewport rather than compete with it for permanent width. Built on the native `<dialog>` element via `showModal()`, same as `Modal`.",
      },
    },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button label="Open drawer" onClick={() => setIsOpen(true)} />
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Recent chats">
          <Flexbox direction="column" gap={4} style={{ padding: 8 }}>
            {["Trip planning", "Recipe ideas", "Debugging notes"].map((title, i) => (
              <ListRow
                key={title}
                title={title}
                subtitle="2 hours ago"
                selected={i === 0}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </Flexbox>
        </Drawer>
      </>
    );
  },
};

export const RightSide: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button label="Open right drawer" onClick={() => setIsOpen(true)} />
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Filters" side="right">
          <Flexbox direction="column" gap={8} style={{ padding: 16 }}>
            <ListRow title="All" selected onClick={() => {}} />
            <ListRow title="Unread" selected={false} onClick={() => {}} />
          </Flexbox>
        </Drawer>
      </>
    );
  },
};
