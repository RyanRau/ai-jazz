/**
 * Design tokens.
 *
 * Every value here is emitted as a CSS custom property (`--bs-…`) by
 * `cssVars.ts`, and `useTheme()` hands components `var(--bs-…)` references
 * rather than literals. That is what makes light/dark switching a variable
 * swap instead of a re-render — see `ThemeContext.tsx`.
 *
 * Spacing is deliberately NOT a token: it does not vary by colour scheme, and
 * components take it as raw pixels (`gap={16}`, `padding={24}`).
 */

export type Spacing = 4 | 8 | 12 | 16 | 20 | 24 | 32;

/**
 * Viewport widths (px) for responsive CSS, e.g.
 * `@media (max-width: ${breakpoints.sm}px) { ... }`.
 *
 * Plain numbers, not theme tokens: a `@media` condition can't reference a CSS
 * custom property, so these can't flow through the `var(--bs-…)` system the
 * rest of the theme uses.
 */
export const breakpoints = {
  /** Phones. */
  sm: 480,
  /** Tablets and the usual "mobile vs. desktop" cutoff. */
  md: 768,
  /** Small laptops. */
  lg: 1024,
} as const;

/** Size, weight, style and colour of one text variant. */
export type TextStyle = {
  size: string;
  weight: string;
  style: string;
  color: string;
};

export type HeadingStyle = {
  size: string;
  weight: string;
};

export type Theme = {
  colors: {
    /** Primary action colour. */
    primary: string;
    primaryHover: string;
    /** Neutral, lower-emphasis action. */
    secondary: string;
    secondaryHover: string;
    /** Confirms creation or a successful outcome. */
    success: string;
    successHover: string;
    /** Destructive or failed. */
    error: string;
    errorHover: string;
    /** Needs attention but isn't an error. */
    warning: string;
    warningHover: string;
    /** Page background. */
    background: string;
    /** Raised panels — cards, menus, modals. */
    surface: string;
    surfaceHover: string;
    /** Body copy. */
    text: string;
    /** De-emphasised copy: captions, help text, placeholders. */
    textMuted: string;
    /** Text placed on a filled accent (a primary button, a badge). */
    textOnAccent: string;
    border: string;
    borderStrong: string;
    /** Keyboard focus indicator. */
    focusRing: string;
    /** Scrim behind modals. */
    overlay: string;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
  textTypes: {
    caption: TextStyle;
    body: TextStyle;
    subtitle: TextStyle;
    label: TextStyle;
    display: TextStyle;
  };
  headings: {
    h1: HeadingStyle;
    h2: HeadingStyle;
    h3: HeadingStyle;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadow: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
};

const fonts: Theme["fonts"] = {
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

// Text colours point at colour variables rather than literals, so they follow
// the active scheme without the dark theme having to restate them.
const textTypes: Theme["textTypes"] = {
  caption: {
    size: "10px",
    weight: "400",
    style: "normal",
    color: "var(--bs-color-text-muted)",
  },
  body: { size: "12px", weight: "400", style: "normal", color: "var(--bs-color-text)" },
  subtitle: {
    size: "14px",
    weight: "400",
    style: "normal",
    color: "var(--bs-color-text)",
  },
  label: { size: "14px", weight: "400", style: "normal", color: "var(--bs-color-text)" },
  display: { size: "18px", weight: "600", style: "normal", color: "var(--bs-color-text)" },
};

const headings: Theme["headings"] = {
  h1: { size: "28px", weight: "800" },
  h2: { size: "20px", weight: "700" },
  h3: { size: "16px", weight: "700" },
};

// A tighter, flatter scale than a typical "AI product" rounded-everything
// look — closer to Tailwind UI / MUI's defaults. `full` stays reserved for
// genuine pills (badges, switches, avatars) rather than leaking onto
// structural surfaces like cards and buttons.
const radius: Theme["radius"] = {
  none: "0",
  sm: "3px",
  md: "4px",
  lg: "8px",
  full: "9999px",
};

/** The light palette. */
export const defaultTheme: Theme = {
  colors: {
    primary: "#7da7d9",
    primaryHover: "#6090c8",
    secondary: "#718096",
    secondaryHover: "#4a5568",
    success: "#38a169",
    successHover: "#2f855a",
    error: "#e53e3e",
    errorHover: "#c53030",
    warning: "#d69e2e",
    warningHover: "#b7791f",
    background: "#ffffff",
    surface: "#f8fafc",
    surfaceHover: "#eef2f7",
    text: "#1a202c",
    textMuted: "#718096",
    textOnAccent: "#ffffff",
    border: "#e2e8f0",
    borderStrong: "#cbd5e0",
    focusRing: "#7da7d9",
    overlay: "rgba(15, 20, 25, 0.5)",
  },
  fonts,
  textTypes,
  headings,
  radius,
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 2px 4px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 16px rgba(0, 0, 0, 0.12)",
  },
};

/**
 * The dark palette.
 *
 * Hovers go *lighter* here rather than darker, and `textOnAccent` flips to a
 * dark ink — the accents are light enough on a dark ground that white text on
 * them would fail contrast.
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    primary: "#7da7d9",
    primaryHover: "#9dbde4",
    secondary: "#94a3b8",
    secondaryHover: "#cbd5e1",
    success: "#4ade80",
    successHover: "#86efac",
    error: "#f87171",
    errorHover: "#fca5a5",
    warning: "#fbbf24",
    warningHover: "#fcd34d",
    background: "#0f1419",
    surface: "#1a212b",
    surfaceHover: "#232c38",
    text: "#e8edf3",
    textMuted: "#94a3b8",
    textOnAccent: "#0f1419",
    border: "#2d3846",
    borderStrong: "#3f4c5c",
    focusRing: "#9dbde4",
    overlay: "rgba(0, 0, 0, 0.65)",
  },
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    md: "0 2px 4px rgba(0, 0, 0, 0.45)",
    lg: "0 8px 16px rgba(0, 0, 0, 0.55)",
  },
};
