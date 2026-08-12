import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import TextInput from "./TextInput";

const meta = {
  title: "Forms/TextInput",
  component: TextInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Single-line text input with label, description, and warning support.",
      },
    },
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <TextInput
        label="Name"
        description="Enter your full name."
        placeholder="e.g. Jane Smith"
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithWarning: Story = {
  render: () => {
    const [value, setValue] = useState("bad@");
    return (
      <TextInput
        label="Email"
        warning="That doesn't look like a valid email."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Username",
    value: "ryanrau",
    isDisabled: true,
    onChange: () => {},
  },
};
