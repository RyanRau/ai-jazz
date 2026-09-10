import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";

const meta = {
  title: "Buttons/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A styled clickable button. Colors and typography are driven by the active theme.",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Button",
  },
  parameters: {
    docs: {
      description: { story: "The default button using theme primary color." },
    },
  },
};

export const LongLabel: Story = {
  args: {
    label: "Click me to do something",
  },
  parameters: {
    docs: {
      description: {
        story: "Button expands horizontally to fit the label text.",
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary",
    variant: "secondary",
  },
  parameters: {
    docs: { description: { story: "Neutral gray — lower visual emphasis." } },
  },
};

export const Creation: Story = {
  args: {
    label: "Create",
    variant: "creation",
  },
  parameters: {
    docs: { description: { story: "Green — confirms creation or a successful action." } },
  },
};

export const Destructive: Story = {
  args: {
    label: "Delete",
    variant: "destructive",
  },
  parameters: {
    docs: { description: { story: "Red — warns of an irreversible or dangerous action." } },
  },
};

export const Outline: Story = {
  args: {
    label: "Outline",
    appearance: "outline",
  },
  parameters: {
    docs: {
      description: {
        story: "Transparent background, colored border and label — the MUI 'Outlined' style.",
      },
    },
  },
};

export const Text: Story = {
  args: {
    label: "Text",
    appearance: "text",
  },
  parameters: {
    docs: {
      description: { story: "No border or fill — lowest emphasis, MUI's 'Text' style." },
    },
  },
};

export const Disabled: Story = {
  args: {
    label: "Unavailable",
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled state — reduced opacity and not-allowed cursor.",
      },
    },
  },
};
