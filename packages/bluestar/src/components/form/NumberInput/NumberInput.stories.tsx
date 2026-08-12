import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import NumberInput from "./NumberInput";

const meta = {
  title: "Forms/NumberInput",
  component: NumberInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Numeric input. `value` is `number | null`; `null` when the field is empty.",
      },
    },
  },
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<number | null>(null);
    return (
      <NumberInput
        label="Age"
        description="Must be 18 or older."
        placeholder="Enter age"
        min={0}
        max={120}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithWarning: Story = {
  render: () => {
    const [value, setValue] = useState<number | null>(5);
    return (
      <NumberInput
        label="Quantity"
        warning="Maximum order is 10."
        min={1}
        max={10}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Price",
    value: 99,
    isDisabled: true,
    onChange: () => {},
  },
};
