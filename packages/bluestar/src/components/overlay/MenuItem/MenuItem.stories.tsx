import type { Meta, StoryObj } from "@storybook/react";
import MenuItem from "./MenuItem";
import Menu from "../Menu/Menu";
import Icon from "../../display/Icon/Icon";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Overlay/MenuItem",
  component: MenuItem,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A clickable row for Menu content — icon, title, optional subtitle, with a block hover/focus highlight. Menu itself imposes no styling on its children, so this is what makes a list of entries feel like a picker rather than plain links in a box.",
      },
    },
  },
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof MenuItem>;

export const Default: Story = {
  args: {
    icon: "📦",
    title: "Stash",
    subtitle: "Track household items and equipment, and share them.",
    href: "#",
  },
  render: (args) => (
    <div style={{ width: 280, padding: 24 }}>
      <MenuItem {...args} />
    </div>
  ),
};

export const InAMenu: Story = {
  render: () => (
    <Flexbox direction="row" justifyContent="flex-end" style={{ padding: 24 }}>
      <Menu trigger={<Icon name="chevronDown" size={16} />} triggerLabel="Switch apps" width={320}>
        <Flexbox direction="column" gap={4}>
          <MenuItem icon="🏠" title="Hub" subtitle="Manage your apps and account." href="#" />
          <MenuItem
            icon="📦"
            title="Stash"
            subtitle="Track household items and equipment, and share them."
            href="#"
          />
          <MenuItem icon="🤖" title="Tony" subtitle="Local LLM tools." href="#" />
        </Flexbox>
      </Menu>
    </Flexbox>
  ),
};
