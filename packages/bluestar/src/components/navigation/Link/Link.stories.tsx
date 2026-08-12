import type { Meta, StoryObj } from "@storybook/react";
import Link from "./Link";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

const meta = {
  title: "Navigation/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A themed anchor. `external` adds `target="_blank"` together with `rel="noopener noreferrer"` — without the latter, the opened page can reach back through `window.opener`.',
      },
    },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof Link>;

export const Variants: Story = {
  render: () => (
    <Flexbox direction="column" gap={12}>
      <Link href="#">Primary link</Link>
      <Link href="#" variant="muted">
        Muted link, inherits surrounding colour
      </Link>
      <Link href="https://pocketbase.io" external>
        External link
      </Link>
      <Text variant="body">
        Inline inside a sentence: <Link href="#">read the docs</Link> and carry on.
      </Text>
    </Flexbox>
  ),
};
