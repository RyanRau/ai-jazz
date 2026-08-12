import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import RadioGroup from "./RadioGroup";

const meta = {
  title: "Forms/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Pick exactly one. Past about six options, prefer `Dropdown`.",
      },
    },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const options = [
  { label: "Public", value: "public", description: "Anyone can view this record." },
  { label: "Private", value: "private", description: "Only you can view it." },
  { label: "Unlisted", value: "unlisted", description: "Reachable with the direct link." },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>("private");
    return (
      <RadioGroup
        label="Visibility"
        description="Controls who can read the record."
        options={options}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithError: Story = {
  render: () => (
    <RadioGroup
      label="Visibility"
      options={options}
      value={null}
      onChange={() => {}}
      required
      error="Pick a visibility"
    />
  ),
};
