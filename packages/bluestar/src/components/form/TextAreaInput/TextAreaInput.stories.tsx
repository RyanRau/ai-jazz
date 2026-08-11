import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import TextAreaInput from "./TextAreaInput";

const meta = {
  title: "Forms/TextAreaInput",
  component: TextAreaInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Multi-line text area with label, description, and warning support. Vertically resizable by the user.",
      },
    },
  },
} satisfies Meta<typeof TextAreaInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <TextAreaInput
        label="Bio"
        description="Tell us a bit about yourself."
        placeholder="Write something..."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithWarning: Story = {
  render: () => {
    const [value, setValue] = useState("x".repeat(300));
    return (
      <TextAreaInput
        label="Notes"
        warning="Maximum 250 characters allowed."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Summary",
    value: "This field cannot be edited.",
    isDisabled: true,
    onChange: () => {},
  },
};
