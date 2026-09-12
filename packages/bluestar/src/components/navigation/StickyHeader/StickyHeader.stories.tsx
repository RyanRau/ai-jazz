import type { Meta, StoryObj } from "@storybook/react";
import StickyHeader from "./StickyHeader";
import AppShell from "../AppShell/AppShell";
import SideNav from "../SideNav/SideNav";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";
import Text from "../../text/Text/Text";
import Button from "../../buttons/Button/Button";
import Badge from "../../display/Badge/Badge";

const meta = {
  title: "Navigation/StickyHeader",
  component: StickyHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A sticky header for content living inside a `sideNav`-bearing `AppShell`'s own scrolling `main` — e.g. a page's own title/actions row, pinned above its content as it scrolls. Compensates for `main`'s own `padding-top: 24px` (which a plain `position: sticky; top: 0` sticks 24px below, per the component's own doc comment) above `breakpoints.sm`, where `main` itself is the scroll container; below it, where the whole page scrolls instead, no compensation is applied. Scroll this story's content to see it stay pinned with no gap above it.",
      },
    },
  },
} satisfies Meta<typeof StickyHeader>;

export default meta;
type Story = StoryObj<typeof StickyHeader>;

export const Default: Story = {
  render: () => (
    <AppShell
      sideNav={
        <SideNav
          items={[
            { key: "chat", label: "Chat", icon: "chat" },
            { key: "keys", label: "Keys", icon: "key" },
          ]}
          activeKey="chat"
          storageKey={null}
        />
      }
    >
      <StickyHeader>
        <Flexbox justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
          <Flexbox direction="column" gap={4}>
            <Header variant="h2">A long conversation</Header>
            <Text variant="caption">Started just now</Text>
          </Flexbox>
          <Flexbox gap={8} alignItems="center">
            <Badge variant="neutral">qwen-14b</Badge>
            <Button label="Delete" variant="destructive" density="dense" onClick={() => {}} />
          </Flexbox>
        </Flexbox>
      </StickyHeader>
      <Flexbox direction="column" gap={16} style={{ paddingTop: 16 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <Text key={i} variant="body">
            Scrolling paragraph {i + 1} — the header above should stay pinned to the very top of the
            viewport with no gap, no border cut off, and nothing showing through above it.
          </Text>
        ))}
      </Flexbox>
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Scroll down inside this story's canvas: the header stays flush with the top, with no sliver of paragraph text visible above it — the bug this component fixes, reproduced live before this component existed by querying `elementFromPoint` in that gap.",
      },
    },
  },
};
