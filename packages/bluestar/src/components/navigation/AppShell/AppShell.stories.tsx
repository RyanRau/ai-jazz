import type { Meta, StoryObj } from "@storybook/react";
import AppShell from "./AppShell";
import SideNav from "../SideNav/SideNav";
import Link from "../Link/Link";
import Card from "../../layout/Card/Card";
import StatTile from "../../display/StatTile/StatTile";
import Text from "../../text/Text/Text";
import Header from "../../text/Header/Header";
import Button from "../../buttons/Button/Button";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Avatar from "../../display/Avatar/Avatar";
import Icon from "../../display/Icon/Icon";
import Menu from "../../overlay/Menu/Menu";
import { useColorScheme } from "../../../theme";

const meta = {
  title: "Navigation/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-width header (title pinned left, account control pinned right), a content region below it, optional footer — so every app doesn't rebuild the same page chrome. The content region is centred and width-capped by default for a plain page, but fills the available width by default once `sideNav` is given: a dashboard shell's content isn't a document that benefits from a narrow reading column, and capping it next to the rail just wastes the rest of the viewport. See `maxWidth` to override either way.",
      },
    },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof AppShell>;

function SchemeToggle() {
  const { resolved, setScheme } = useColorScheme();
  return (
    <Button
      label={resolved === "dark" ? "Light" : "Dark"}
      variant="secondary"
      density="dense"
      onClick={() => setScheme(resolved === "dark" ? "light" : "dark")}
    />
  );
}

export const Default: Story = {
  render: () => (
    <AppShell
      title="Recipe Box"
      appSwitcher={
        <Menu trigger={<Icon name="chevronDown" size={16} />} triggerLabel="Switch apps">
          <Flexbox direction="column" gap={4} style={{ padding: "4px 8px" }}>
            <Link href="#" variant="muted">
              Hub
            </Link>
            <Link href="#" variant="muted">
              Stash
            </Link>
          </Flexbox>
        </Menu>
      }
      nav={
        <>
          <Link href="#">Recipes</Link>
          <Link href="#">Tags</Link>
          <SchemeToggle />
        </>
      }
      account={
        <Menu trigger={<Avatar name="Ryan Rau" />} triggerLabel="Account menu for Ryan Rau">
          <Flexbox direction="column" gap={12}>
            <Flexbox direction="column" gap={4} style={{ padding: "4px 8px" }}>
              <Text variant="label">Ryan Rau</Text>
              <Text variant="caption">ryan@example.com</Text>
            </Flexbox>
            <div style={{ padding: "0 8px" }}>
              <Link href="#" variant="muted">
                Settings
              </Link>
            </div>
            <Button label="Log out" variant="secondary" density="dense" onClick={() => {}} />
          </Flexbox>
        </Menu>
      }
      footer={<Text variant="caption">Deployed from the monorepo.</Text>}
    >
      <Flexbox direction="column" gap={16}>
        <Header variant="h1">Your recipes</Header>
        <Card padding={24}>
          <Text variant="subtitle">
            Content sits in a max-width column. The toggle in the header uses `useColorScheme`,
            which is the real exported API rather than a Storybook trick.
          </Text>
        </Card>
      </Flexbox>
    </AppShell>
  ),
};

export const WithSideNav: Story = {
  render: () => (
    <AppShell
      sideNav={
        <SideNav
          items={[
            { key: "keys", label: "Keys", icon: "key" },
            { key: "playground", label: "Playground", icon: "search" },
          ]}
          activeKey="keys"
          storageKey={null}
        />
      }
    >
      <Flexbox direction="column" gap={20}>
        <Header variant="h2">Keys</Header>
        <Flexbox gap={16} flexWrap="wrap">
          <StatTile label="Total calls" value="1,204" />
          <StatTile label="Tokens in" value="318K" />
          <StatTile label="Tokens out" value="96.4K" />
        </Flexbox>
        <Card padding={24}>
          <Text variant="subtitle">
            No `maxWidth` passed here — a shell with `sideNav` fills the available width by default
            instead of capping content at 960px next to the rail. Resize this story's viewport wide
            to see the stat tiles and card actually use the space, rather than floating in a narrow
            centred column with dead space on either side.
          </Text>
        </Card>
      </Flexbox>
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The dashboard-shell default: `sideNav` given, no `maxWidth` passed, content fills the rest of the viewport instead of being centred and capped.",
      },
    },
  },
};
