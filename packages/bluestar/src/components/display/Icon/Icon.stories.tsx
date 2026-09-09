import type { Meta, StoryObj } from "@storybook/react";
import Icon from "./Icon";
import type { IconName } from "./Icon";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import { useTheme } from "../../../theme";

const meta = {
  title: "Display/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A small curated set of stroke icons (adapted from Lucide, ISC License) — not a general-purpose icon library. `color` defaults to `currentColor` so it inherits surrounding text/button color for free.",
      },
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof Icon>;

const ALL_NAMES: IconName[] = [
  "settings",
  "logOut",
  "close",
  "chevronDown",
  "check",
  "user",
  "plus",
  "trash",
  "search",
  "externalLink",
];

export const AllIcons: Story = {
  render: () => (
    <Flexbox direction="row" flexWrap="wrap" gap={24}>
      {ALL_NAMES.map((name) => (
        <Flexbox key={name} direction="column" alignItems="center" gap={8}>
          <Icon name={name} size={24} />
          <Text variant="caption">{name}</Text>
        </Flexbox>
      ))}
    </Flexbox>
  ),
};

function ColorInheritanceDemo() {
  const theme = useTheme();
  return (
    <Flexbox direction="row" gap={16}>
      <div style={{ color: theme.colors.primary }}>
        <Icon name="check" size={32} />
      </div>
      <div style={{ color: theme.colors.error }}>
        <Icon name="trash" size={32} />
      </div>
      <Icon name="settings" size={32} color={theme.colors.success} />
    </Flexbox>
  );
}

export const ColorInheritance: Story = {
  render: () => <ColorInheritanceDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "The first two icons inherit color from a parent's CSS `color` via the default `currentColor`; the third overrides `color` explicitly.",
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <Flexbox direction="row" gap={16} alignItems="center">
      <Icon name="settings" size={16} />
      <Icon name="settings" size={20} />
      <Icon name="settings" size={28} />
      <Icon name="settings" size={40} />
    </Flexbox>
  ),
};
