import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import TokenSelect from "./TokenSelect";

const OPTIONS = [
  { label: "Hub", value: "hub" },
  { label: "Stash", value: "stash" },
  { label: "Tony", value: "tony" },
];

const meta = {
  title: "Forms/TokenSelect",
  component: TokenSelect,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Selected values as removable pills, with a picker to add more from a short, closed list of options.",
      },
    },
  },
} satisfies Meta<typeof TokenSelect>;

export default meta;
type Story = StoryObj<typeof TokenSelect>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(["stash"]);
    return (
      <TokenSelect
        label="App access"
        description="Apps this user can open."
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return <TokenSelect label="App access" options={OPTIONS} value={value} onChange={setValue} />;
  },
};

export const AllSelected: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(OPTIONS.map((o) => o.value));
    return <TokenSelect label="App access" options={OPTIONS} value={value} onChange={setValue} />;
  },
};

export const Disabled: Story = {
  args: {
    label: "App access",
    options: OPTIONS,
    value: ["hub", "tony"],
    isDisabled: true,
    onChange: () => {},
  },
};
