import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Switch from "./Switch";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A setting that takes effect immediately. Built on a checkbox input with `role="switch"`, so keyboard and screen-reader behaviour stay native.',
      },
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(true);
    return (
      <Switch
        label="Published"
        description="Visible to anyone with the link."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const States: Story = {
  render: () => (
    <Flexbox direction="column" gap={16}>
      <Switch label="On" value onChange={() => {}} />
      <Switch label="Off" value={false} onChange={() => {}} />
      <Switch label="Disabled" value onChange={() => {}} isDisabled />
    </Flexbox>
  ),
};
