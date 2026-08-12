import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Dropdown from "./Dropdown";

const OPTIONS = [
  { label: "React", value: "react" },
  { label: "Vue", value: "vue" },
  { label: "Svelte", value: "svelte" },
  { label: "Solid", value: "solid" },
];

const meta = {
  title: "Forms/Dropdown",
  component: Dropdown,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Native select input. Use `multi` for multi-select (hold Ctrl/Cmd to select multiple). Single select `value` is `string | null`; multi `value` is `string[]`.",
      },
    },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Single: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Dropdown
        label="Framework"
        description="Choose your frontend framework."
        placeholder="Select one…"
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Multi: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <Dropdown
        multi
        label="Frameworks"
        description="Hold Ctrl / Cmd to select multiple."
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithWarning: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Dropdown
        label="Framework"
        warning="A selection is required."
        placeholder="Select one…"
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Framework",
    options: OPTIONS,
    value: "react",
    isDisabled: true,
    onChange: () => {},
  },
};
