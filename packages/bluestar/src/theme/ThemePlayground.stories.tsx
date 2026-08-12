import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider, defaultTheme } from "./index";
import Button from "../components/buttons/Button/Button";
import AsyncButton from "../components/buttons/AsyncButton/AsyncButton";
import Header from "../components/text/Header/Header";
import Text from "../components/text/Text/Text";
import Card from "../components/layout/Card/Card";
import Spinner from "../components/feedback/Spinner/Spinner";
import Flexbox from "../components/layout/Flexbox/Flexbox";

type PlaygroundArgs = {
  // Colors
  primary: string;
  primaryHover: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  // Fonts
  bodyFont: string;
  headingFont: string;
};

function ThemePlayground(args: PlaygroundArgs) {
  return (
    <ThemeProvider
      theme={{
        colors: {
          primary: args.primary,
          primaryHover: args.primaryHover,
          background: args.background,
          surface: args.surface,
          text: args.text,
          textMuted: args.textMuted,
          border: args.border,
        },
        fonts: {
          body: args.bodyFont,
          heading: args.headingFont,
        },
      }}
    >
      <div
        style={{
          backgroundColor: args.background,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <Header variant="h1">Theme Playground</Header>
        <Text variant="caption">Adjust controls in the panel below to preview your theme.</Text>

        <Flexbox direction="column" gap={8}>
          <Header variant="h1">h1 Heading</Header>
          <Header variant="h2">h2 Heading</Header>
          <Header variant="h3">h3 Heading</Header>
        </Flexbox>

        <Flexbox direction="column" gap={4}>
          <Text variant="display">Display text</Text>
          <Text variant="subtitle">Subtitle text</Text>
          <Text variant="body">Body text</Text>
          <Text variant="caption">Caption text</Text>
        </Flexbox>

        <Flexbox direction="row" gap={12} alignItems="center">
          <Button label="Primary" onClick={() => {}} />
          <Button label="Secondary" variant="secondary" onClick={() => {}} />
          <Button label="Creation" variant="creation" onClick={() => {}} />
          <Button label="Destructive" variant="destructive" onClick={() => {}} />
          <AsyncButton label="Async" onClick={() => new Promise((r) => setTimeout(r, 2000))} />
          <Spinner />
        </Flexbox>

        <Flexbox direction="row" gap={16}>
          <Card>
            <Flexbox direction="column" gap={8}>
              <Header variant="h3">Card Title</Header>
              <Text variant="subtitle">Regular body text inside a card.</Text>
              <Text variant="caption">Muted supporting text.</Text>
            </Flexbox>
          </Card>

          <Card>
            <Flexbox direction="column" gap={8}>
              <Header variant="h3">Another Card</Header>
              <Text variant="subtitle">Subtitle text.</Text>
              <Text variant="caption">Caption muted text.</Text>
            </Flexbox>
          </Card>
        </Flexbox>
      </div>
    </ThemeProvider>
  );
}

const meta = {
  title: "Theme/Playground",
  component: ThemePlayground,
  tags: ["autodocs"],
  argTypes: {
    primary: { control: "color", table: { category: "Colors" } },
    primaryHover: { control: "color", table: { category: "Colors" } },
    background: { control: "color", table: { category: "Colors" } },
    surface: { control: "color", table: { category: "Colors" } },
    text: { control: "color", table: { category: "Colors" } },
    textMuted: { control: "color", table: { category: "Colors" } },
    border: { control: "color", table: { category: "Colors" } },
    bodyFont: { control: "text", table: { category: "Fonts" } },
    headingFont: { control: "text", table: { category: "Fonts" } },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Interactive theme playground. Use the Controls panel to adjust colors and fonts across all components.",
      },
    },
  },
} satisfies Meta<typeof ThemePlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    primary: defaultTheme.colors.primary,
    primaryHover: defaultTheme.colors.primaryHover,
    background: defaultTheme.colors.background,
    surface: defaultTheme.colors.surface,
    text: defaultTheme.colors.text,
    textMuted: defaultTheme.colors.textMuted,
    border: defaultTheme.colors.border,
    bodyFont: defaultTheme.fonts.body,
    headingFont: defaultTheme.fonts.heading,
  },
};

export const Dark: Story = {
  args: {
    primary: "#7da7d9",
    primaryHover: "#6090c8",
    background: "#1a202c",
    surface: "#2d3748",
    text: "#f7fafc",
    textMuted: "#a0aec0",
    border: "#4a5568",
    bodyFont: defaultTheme.fonts.body,
    headingFont: defaultTheme.fonts.heading,
  },
};

export const Rose: Story = {
  args: {
    primary: "#e53e6a",
    primaryHover: "#c4275a",
    background: "#fff5f7",
    surface: "#fff0f3",
    text: "#1a202c",
    textMuted: "#718096",
    border: "#fed7e2",
    bodyFont: defaultTheme.fonts.body,
    headingFont: defaultTheme.fonts.heading,
  },
};
