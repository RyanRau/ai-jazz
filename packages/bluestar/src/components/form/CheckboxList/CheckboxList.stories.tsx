import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import CheckboxList from "./CheckboxList";

const OPTIONS = [
  { label: "Apples", value: "apples" },
  { label: "Bananas", value: "bananas" },
  { label: "Cherries", value: "cherries" },
  { label: "Dates", value: "dates" },
];

const meta = {
  title: "Forms/CheckboxList",
  component: CheckboxList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Group of checkboxes for multi-value selection. `value` is an array of selected option values.",
      },
    },
  },
} satisfies Meta<typeof CheckboxList>;

export default meta;
type Story = StoryObj<typeof CheckboxList>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <CheckboxList
        label="Favourite fruits"
        description="Select all that apply."
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithWarning: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <CheckboxList
        label="Required selection"
        warning="Please select at least one option."
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Permissions",
    options: OPTIONS,
    value: ["apples", "cherries"],
    isDisabled: true,
    onChange: () => {},
  },
};
