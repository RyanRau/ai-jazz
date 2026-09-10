import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error";

export type BadgeEmphasis = "outline" | "subtle" | "solid";

export type BadgeProps = {
  children: ReactNode;
  /** Colour of the badge. Defaults to `"neutral"`. */
  variant?: BadgeVariant;
  /**
   * - `"outline"` — transparent background, colored border and text (default —
   *   the flat status-chip look)
   * - `"subtle"` — tints the background
   * - `"solid"` — fills it
   */
  emphasis?: BadgeEmphasis;
};

export default function Badge({ children, variant = "neutral", emphasis = "outline" }: BadgeProps) {
  const theme = useTheme();

  const accent = {
    neutral: theme.colors.secondary,
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[variant];

  const background =
    emphasis === "solid"
      ? accent
      : emphasis === "subtle"
        ? `color-mix(in srgb, ${accent} 16%, ${theme.colors.background})`
        : "transparent";
  const border =
    emphasis === "solid" ? "transparent" : `color-mix(in srgb, ${accent} 45%, transparent)`;

  return (
    <span
      className={css`
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: ${theme.radius.full};
        font-family: ${theme.fonts.body};
        font-size: ${theme.textTypes.caption.size};
        font-weight: 600;
        line-height: 1.6;
        white-space: nowrap;
        background-color: ${background};
        color: ${emphasis === "solid" ? theme.colors.textOnAccent : accent};
        border: 1px solid ${border};
      `}
    >
      {children}
    </span>
  );
}
