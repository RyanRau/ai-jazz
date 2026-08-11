import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { type Theme, defaultTheme } from "./theme";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const ThemeContext = createContext<Theme>(defaultTheme);

type ThemeProviderProps = {
  theme?: DeepPartial<Theme>;
  children: ReactNode;
};

type TextTypeStyle = Theme["textTypes"][keyof Theme["textTypes"]];
type HeadingStyle = Theme["headings"][keyof Theme["headings"]];

function mergeTextType(
  base: TextTypeStyle,
  override: DeepPartial<TextTypeStyle> | undefined
): TextTypeStyle {
  return {
    size: override?.size ?? base.size,
    bold: override?.bold ?? base.bold,
    italic: override?.italic ?? base.italic,
    muted: override?.muted ?? base.muted,
  };
}

function mergeHeading(
  base: HeadingStyle,
  override: DeepPartial<HeadingStyle> | undefined
): HeadingStyle {
  return {
    size: override?.size ?? base.size,
    weight: override?.weight ?? base.weight,
  };
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const merged: Theme = theme
    ? {
        colors: { ...defaultTheme.colors, ...theme.colors },
        fonts: { ...defaultTheme.fonts, ...theme.fonts },
        textTypes: {
          caption: mergeTextType(defaultTheme.textTypes.caption, theme.textTypes?.caption),
          body: mergeTextType(defaultTheme.textTypes.body, theme.textTypes?.body),
          subtitle: mergeTextType(defaultTheme.textTypes.subtitle, theme.textTypes?.subtitle),
          display: mergeTextType(defaultTheme.textTypes.display, theme.textTypes?.display),
          label: mergeTextType(defaultTheme.textTypes.label, theme.textTypes?.label),
        },
        headings: {
          h1: mergeHeading(defaultTheme.headings.h1, theme.headings?.h1),
          h2: mergeHeading(defaultTheme.headings.h2, theme.headings?.h2),
          h3: mergeHeading(defaultTheme.headings.h3, theme.headings?.h3),
        },
        radius: theme.radius ?? defaultTheme.radius,
        shadow: theme.shadow ?? defaultTheme.shadow,
      }
    : defaultTheme;

  return <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
