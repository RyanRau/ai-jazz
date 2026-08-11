export type Spacing = 4 | 8 | 12 | 16 | 20 | 24 | 32;

export type Theme = {
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    errorHover: string;
    success: string;
    successHover: string;
    warning: string;
    secondaryButton: string;
    secondaryButtonHover: string;
    light: string;
    dark: string;
  };
  fonts: {
    body: string;
    heading: string;
    mono: string;
  };
  textTypes: {
    caption: { size: string; bold: boolean; italic: boolean; muted: boolean };
    body: { size: string; bold: boolean; italic: boolean; muted: boolean };
    subtitle: { size: string; bold: boolean; italic: boolean; muted: boolean };
    display: { size: string; bold: boolean; italic: boolean; muted: boolean };
    label: { size: string; bold: boolean; italic: boolean; muted: boolean };
  };
  headings: {
    h1: { size: string; weight: string };
    h2: { size: string; weight: string };
    h3: { size: string; weight: string };
  };
  radius: string;
  shadow: string;
};

export const defaultTheme: Theme = {
  colors: {
    primary: "#7da7d9",
    primaryHover: "#6090c8",
    secondary: "#f0f4f8",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1a202c",
    textMuted: "#718096",
    border: "#e2e8f0",
    error: "#e53e3e",
    errorHover: "#c53030",
    success: "#38a169",
    successHover: "#2f855a",
    warning: "#d69e2e",
    secondaryButton: "#718096",
    secondaryButtonHover: "#4a5568",
    light: "#ffffff",
    dark: "#1a202c",
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  textTypes: {
    caption: { size: "10px", bold: false, italic: false, muted: true },
    body: { size: "12px", bold: false, italic: false, muted: false },
    subtitle: { size: "14px", bold: false, italic: false, muted: false },
    display: { size: "18px", bold: true, italic: false, muted: false },
    label: { size: "14px", bold: false, italic: false, muted: false },
  },
  headings: {
    h1: { size: "28px", weight: "800" },
    h2: { size: "20px", weight: "700" },
    h3: { size: "16px", weight: "700" },
  },
  radius: "6px",
  shadow: "0 4px 6px rgba(0,0,0,0.1)",
};
