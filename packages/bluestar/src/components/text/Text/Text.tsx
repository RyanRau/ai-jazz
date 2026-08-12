import { css } from "goober";
import { VAR_PREFIX } from "../../../theme";
import type { Theme } from "../../../theme";

export type TextType = keyof Theme["textTypes"];

type TextProps = {
  /** The text content. */
  children: React.ReactNode;
  /**
   * Text type from the theme. Controls size, weight, style, and colour.
   * - `"caption"` — smallest, muted; for timestamps and help text
   * - `"body"` — compact body copy
   * - `"subtitle"` — default body size
   * - `"label"` — form labels and button text
   * - `"display"` — largest, bold; for hero text
   */
  variant?: TextType;
  /** Override the theme colour. Useful on a coloured background. */
  color?: string;
  /** Element to render. Defaults to `"p"`. */
  as?: "p" | "span" | "label";
};

export default function Text({ children, variant = "subtitle", color, as: Tag = "p" }: TextProps) {
  // Read the variant's variables directly rather than going through useTheme —
  // the values are CSS custom properties either way, and this keeps Text free
  // of a context subscription.
  return (
    <Tag
      className={css`
        font-family: var(${VAR_PREFIX}-font-body);
        font-size: var(${VAR_PREFIX}-text-${variant}-size);
        font-weight: var(${VAR_PREFIX}-text-${variant}-weight);
        font-style: var(${VAR_PREFIX}-text-${variant}-style);
        color: ${color ?? `var(${VAR_PREFIX}-text-${variant}-color)`};
        margin: 0;
        line-height: 1.5;
      `}
    >
      {children}
    </Tag>
  );
}
