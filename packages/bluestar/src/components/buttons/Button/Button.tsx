import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";
import type { ComponentPropsWithoutRef } from "react";
import Text from "../../text/Text/Text";

export type ButtonType = "primary" | "secondary" | "creation" | "destructive";

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "disabled" | "type"> & {
  /** The text label. Used as content when no children are provided. */
  label: string;
  /**
   * Visual intent of the button.
   * - `"primary"` — default blue action
   * - `"secondary"` — neutral, lower emphasis
   * - `"creation"` — green, confirms creation or success
   * - `"destructive"` — red, warns of irreversible actions
   */
  type?: ButtonType;
  /** Disables the button — applies reduced opacity and a not-allowed cursor. */
  isDisabled?: boolean;
  /**
   * Controls padding density.
   * - `"normal"` — default (8px 16px)
   * - `"dense"` — compact (4px 10px)
   */
  density?: "normal" | "dense";
};

function getColors(type: ButtonType, theme: Theme) {
  switch (type) {
    case "secondary":
      return { bg: theme.colors.secondaryButton, hover: theme.colors.secondaryButtonHover };
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
  type = "primary",
  density = "normal",
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const { bg, hover } = getColors(type, theme);
  const padding = density === "dense" ? "4px 10px" : "8px 16px";

  return (
    <button
      disabled={isDisabled}
      className={css`
        border-radius: ${theme.radius};
        border: none;
        font-family: ${theme.fonts.body};
        color: ${theme.colors.light};
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
          box-shadow: ${theme.shadow};
          background-color: ${hover};
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}
      {...props}
    >
      {children ?? (
        <Text variant="label" color={theme.colors.light}>
          {label}
        </Text>
      )}
    </button>
  );
}
