import type { Meta, StoryObj } from "@storybook/react";
import Menu from "./Menu";
import Avatar from "../../display/Avatar/Avatar";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Link from "../../navigation/Link/Link";
import Button from "../../buttons/Button/Button";

const meta = {
  title: "Overlay/Menu",
  component: Menu,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A single flat dropdown, right-aligned to its trigger. Built on the native Popover API — click the avatar to open it, click outside or press Esc to close.",
      },
    },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof Menu>;

export const Default: Story = {
  render: () => (
    <Flexbox direction="row" justifyContent="flex-end" style={{ padding: 24 }}>
      <Menu trigger={<Avatar name="Ryan Rau" />} triggerLabel="Account menu for Ryan Rau">
        <Flexbox direction="column" gap={12}>
          <Flexbox direction="column" gap={4} style={{ padding: "4px 8px" }}>
            <Text variant="label">Ryan Rau</Text>
            <Text variant="caption">ryan@example.com</Text>
          </Flexbox>
          <div style={{ padding: "0 8px" }}>
            <Link href="#" variant="muted">
              Settings
            </Link>
          </div>
          <Button label="Log out" variant="secondary" density="dense" onClick={() => {}} />
        </Flexbox>
      </Menu>
    </Flexbox>
  ),
};
