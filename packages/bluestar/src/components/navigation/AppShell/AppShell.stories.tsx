import type { Meta, StoryObj } from "@storybook/react";
import AppShell from "./AppShell";
import Link from "../Link/Link";
import Card from "../../layout/Card/Card";
import Text from "../../text/Text/Text";
import Header from "../../text/Header/Header";
import Button from "../../buttons/Button/Button";
import Flexbox from "../../layout/Flexbox/Flexbox";
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
          "Header, centred content column, optional footer — so every app doesn't rebuild the same page chrome and they all agree on content width.",
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
      nav={
        <>
          <Link href="#">Recipes</Link>
          <Link href="#">Tags</Link>
          <SchemeToggle />
        </>
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
