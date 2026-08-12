import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error";

export type BadgeProps = {
  children: ReactNode;
  /** Colour of the badge. Defaults to `"neutral"`. */
  variant?: BadgeVariant;
  /** `"subtle"` tints the background; `"solid"` fills it. Defaults to `"subtle"`. */
  emphasis?: "subtle" | "solid";
};

export default function Badge({ children, variant = "neutral", emphasis = "subtle" }: BadgeProps) {
  const theme = useTheme();

  const accent = {
    neutral: theme.colors.secondary,
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[variant];

  const solid = emphasis === "solid";

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
        background-color: ${solid
          ? accent
          : `color-mix(in srgb, ${accent} 16%, ${theme.colors.background})`};
        color: ${solid ? theme.colors.textOnAccent : accent};
        border: 1px solid
          ${solid ? "transparent" : `color-mix(in srgb, ${accent} 35%, transparent)`};
      `}
    >
      {children}
    </span>
  );
}
