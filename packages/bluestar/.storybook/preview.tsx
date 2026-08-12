import type { Preview, Decorator } from "@storybook/react";
import { ThemeProvider } from "../src/theme";
import type { ColorScheme } from "../src/theme";
import "../src/styling";

/**
 * Drives the library's real `colorScheme` API rather than swapping in a
 * hand-rolled dark palette — if dark mode is broken for a component, it is
 * visibly broken here too.
 *
 * `storageKey={null}` keeps the toolbar authoritative; otherwise a persisted
 * choice from a previous session would fight the toolbar selection.
 */
const withTheme: Decorator = (Story, context) => {
  const scheme = (context.globals["theme"] as ColorScheme) ?? "auto";

  return (
    <ThemeProvider colorScheme={scheme} storageKey={null}>
      <div style={{ padding: 16, minHeight: "100%" }}>
        <Story />
      </div>
    </ThemeProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Colour scheme",
      defaultValue: "light",
      toolbar: {
        title: "Scheme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "auto", title: "Auto (OS)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
