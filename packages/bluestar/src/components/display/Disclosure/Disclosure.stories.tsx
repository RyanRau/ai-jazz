import type { Meta, StoryObj } from "@storybook/react";
import Disclosure from "./Disclosure";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Link from "../../navigation/Link/Link";

const meta = {
  title: "Display/Disclosure",
  component: Disclosure,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A collapsible section for content that's genuinely optional to read -- tool calls behind a chat reply, a raw error detail -- collapsed by default.",
      },
    },
  },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof Disclosure>;

export const Default: Story = {
  render: () => (
    <Disclosure label="2 tools used">
      <Flexbox direction="column" gap={8}>
        <Text variant="caption">Searched the web: "current weather in Boston"</Text>
        <Link href="https://weather.example.com" external variant="muted">
          <Text variant="caption">weather.example.com</Text>
        </Link>
      </Flexbox>
    </Disclosure>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Disclosure label="1 tool used" defaultOpen>
      <Text variant="caption">Searched the web: "pocketbase migrations"</Text>
    </Disclosure>
  ),
};
