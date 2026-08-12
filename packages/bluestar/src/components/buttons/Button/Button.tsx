import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";
import type { ComponentPropsWithoutRef } from "react";
import Text from "../../text/Text/Text";

export type ButtonVariant = "primary" | "secondary" | "creation" | "destructive";

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "disabled"> & {
  /** The text label. Used as content when no children are provided. */
  label: string;
  /**
   * Visual intent of the button.
   * - `"primary"` — default blue action
   * - `"secondary"` — neutral, lower emphasis
   * - `"creation"` — green, confirms creation or success
   * - `"destructive"` — red, warns of irreversible actions
   */
  variant?: ButtonVariant;
  /** Disables the button — applies reduced opacity and a not-allowed cursor. */
  isDisabled?: boolean;
  /**
   * Controls padding density.
   * - `"normal"` — default (8px 16px)
   * - `"dense"` — compact (4px 10px)
   */
  density?: "normal" | "dense";
};

function getColors(variant: ButtonVariant, theme: Theme) {
  switch (variant) {
    case "secondary":
      return { bg: theme.colors.secondary, hover: theme.colors.secondaryHover };
    case "creation":
      return { bg: theme.colors.success, hover: theme.colors.successHover };
    case "destructive":
      return { bg: theme.colors.error, hover: theme.colors.errorHover };
    default:
      return { bg: theme.colors.primary, hover: theme.colors.primaryHover };
  }
}

export default function Button({
  label,
  children,
  isDisabled,
  variant = "primary",
  density = "normal",
  // Native button semantics. Defaults to "button" so a button inside a form
  // doesn't submit it by accident; pass "submit" deliberately (or use
  // SubmitButton, which does it for you).
  type = "button",
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const { bg, hover } = getColors(variant, theme);
  const padding = density === "dense" ? "4px 10px" : "8px 16px";

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={css`
        border-radius: ${theme.radius.md};
        border: none;
        font-family: ${theme.fonts.body};
        color: ${theme.colors.textOnAccent};
        padding: ${padding};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background-color: ${bg};
        cursor: pointer;
        transition:
          box-shadow 0.15s ease,
          background-color 0.15s ease;

        &:hover:not(:disabled) {
          box-shadow: ${theme.shadow.md};
          background-color: ${hover};
        }

        &:focus-visible {
          outline: 2px solid ${theme.colors.focusRing};
          outline-offset: 2px;
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}
      {...props}
    >
      {children ?? (
        <Text variant="label" color={theme.colors.textOnAccent}>
          {label}
        </Text>
      )}
    </button>
  );
}
