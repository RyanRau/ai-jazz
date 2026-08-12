import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "./Checkbox";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A single boolean. Use `CheckboxList` when picking several from a set of options.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(false);
    return (
      <Checkbox
        label="Send me a copy"
        description="We'll email a receipt to the address on file."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const States: Story = {
  render: () => (
    <Flexbox direction="column" gap={16}>
      <Checkbox label="Checked" value onChange={() => {}} />
      <Checkbox label="Disabled" value={false} onChange={() => {}} isDisabled />
      <Checkbox
        label="With an error"
        value={false}
        onChange={() => {}}
        error="You must accept the terms"
      />
    </Flexbox>
  ),
};
