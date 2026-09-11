import type { DeepPartial, Theme } from "bluestar";

/**
 * A minimal re-color of bluestar's default theme, matching Landing.tsx's
 * warm/light "nature journal" palette -- deliberately just colors and
 * fonts (deep-merged over bluestar's `defaultTheme`/`darkTheme` by
 * `ThemeProvider`), not a structural change to any component. Scoped to
 * this app alone via `ThemeProvider`'s own `theme`/`darkTheme` props in
 * main.tsx -- stash and tony keep bluestar's stock look.
 */
export const natureTheme: DeepPartial<Theme> = {
  colors: {
    primary: "#b6603c", // clay
    primaryHover: "#8f4a2d",
    secondary: "#8a7a5f",
    secondaryHover: "#6b5f4f",
    success: "#5f7a54", // sage
    successHover: "#4b5d3a",
    error: "#b0402c",
    errorHover: "#8f3322",
    warning: "#c98a2c", // mustard
    warningHover: "#a8721f",
    background: "#f6f0e2", // paper
    surface: "#fbf6ea", // card
    surfaceHover: "#f1e7d0",
    text: "#3a3126", // ink
    textMuted: "#6b5f4f",
    textOnAccent: "#fbf6ea",
    border: "#cbb98f",
    borderStrong: "#a8926a",
    focusRing: "#b6603c",
    overlay: "rgba(58, 49, 38, 0.5)",
  },
  fonts: {
    body: '"Karla", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: '"Bitter", Georgia, serif',
  },
};

/**
 * Same palette, inverted for dark mode -- hovers go lighter and
 * `textOnAccent` flips to ink, the same convention bluestar's own
 * `darkTheme` uses, for the same reason (the accents are light enough on
 * a dark ground that light-on-light would fail contrast otherwise).
 */
export const natureDarkTheme: DeepPartial<Theme> = {
  colors: {
    primary: "#d98a5f",
    primaryHover: "#e6a67f",
    secondary: "#b8a888",
    secondaryHover: "#cbb99a",
    success: "#8fae7a",
    successHover: "#a6c393",
    error: "#d97a63",
    errorHover: "#e2967f",
    warning: "#dcae5a",
    warningHover: "#e6c07d",
    background: "#241d16",
    surface: "#2f261c",
    surfaceHover: "#3a2f23",
    text: "#ede2cc",
    textMuted: "#b8a888",
    textOnAccent: "#241d16",
    border: "#4a3d2c",
    borderStrong: "#5c4c37",
    focusRing: "#d98a5f",
    overlay: "rgba(0, 0, 0, 0.65)",
  },
  fonts: natureTheme.fonts,
};
