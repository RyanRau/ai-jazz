import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";

export type TextType = keyof Theme["textTypes"];

type TextProps = {
  /** The text content. */
  children: React.ReactNode;
  /**
   * Text type from the theme. Controls size, weight, style, and color.
   * - `"caption"` — smallest, muted; for labels and timestamps
   * - `"body"` — compact body copy
   * - `"subtitle"` — default body size
   * - `"label"` — body size, for form labels and button text
   * - `"display"` — largest, bold; for hero text
   */
  variant?: TextType;
  /** Override the theme color. Useful when Text is placed on a colored background. */
  color?: string;
};

export default function Text({ children, variant = "subtitle", color }: TextProps) {
  const theme = useTheme();
  const { size, bold, italic, muted } = theme.textTypes[variant];
  const resolvedColor = color ?? (muted ? theme.colors.textMuted : theme.colors.text);

  return (
    <p
      className={css`
        font-family: ${theme.fonts.body};
        font-size: ${size};
        color: ${resolvedColor};
        font-weight: ${bold ? "600" : "400"};
        font-style: ${italic ? "italic" : "normal"};
        margin: 0;
        line-height: 1.5;
      `}
    >
      {children}
    </p>
  );
}
