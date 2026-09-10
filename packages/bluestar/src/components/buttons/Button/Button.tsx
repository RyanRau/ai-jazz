import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";
import type { ComponentPropsWithoutRef } from "react";
import Text from "../../text/Text/Text";

export type ButtonVariant = "primary" | "secondary" | "creation" | "destructive";

/**
 * Structural style, independent of `variant`'s color intent.
 * - `"solid"` — filled background (default; the only appearance before this existed)
 * - `"outline"` — transparent background, colored border and label
 * - `"text"` — transparent background, no border — lowest emphasis
 */
export type ButtonAppearance = "solid" | "outline" | "text";

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
  /** Structural style — solid fill, outlined, or text-only. Defaults to `"solid"`. */
  appearance?: ButtonAppearance;
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
      return { accent: theme.colors.secondary, accentHover: theme.colors.secondaryHover };
    case "creation":
      return { accent: theme.colors.success, accentHover: theme.colors.successHover };
    case "destructive":
      return { accent: theme.colors.error, accentHover: theme.colors.errorHover };
    default:
      return { accent: theme.colors.primary, accentHover: theme.colors.primaryHover };
  }
}

/**
 * The label/icon color `Button` itself renders for a given variant +
 * appearance — exported so `AsyncButton` and `SubmitButton` can color their
 * own extra children (a spinner) to match instead of hardcoding
 * `textOnAccent`, which goes invisible on `"outline"`/`"text"` appearances.
 */
export function resolveButtonTextColor(
  theme: Theme,
  variant: ButtonVariant = "primary",
  appearance: ButtonAppearance = "solid"
): string {
  return appearance === "solid" ? theme.colors.textOnAccent : getColors(variant, theme).accent;
}

export default function Button({
  label,
  children,
  isDisabled,
  variant = "primary",
  appearance = "solid",
  density = "normal",
  // Native button semantics. Defaults to "button" so a button inside a form
  // doesn't submit it by accident; pass "submit" deliberately (or use
  // SubmitButton, which does it for you).
  type = "button",
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const { accent, accentHover } = getColors(variant, theme);
  // A 1.5px border eats into the outline appearance's box, so its padding
  // is trimmed to match — otherwise it'd read visibly larger than solid/text
  // buttons at the same density.
  const borderWidth = appearance === "outline" ? 1.5 : 0;
  const [paddingY, paddingX] = density === "dense" ? [4, 10] : [8, 16];
  // Comfortable touch targets: the label text plus its own padding lands
  // under the ~44px Apple/Google guideline, especially for "dense" — this
  // floors it without changing the visual padding.
  const minHeight = density === "dense" ? 36 : 44;

  const textColor = appearance === "solid" ? theme.colors.textOnAccent : accent;
  const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={css`
        border-radius: ${theme.radius.md};
        border: ${appearance === "outline" ? `${borderWidth}px solid ${accent}` : "none"};
        font-family: ${theme.fonts.body};
        color: ${textColor};
        padding: ${paddingY - borderWidth}px ${paddingX - borderWidth}px;
        min-height: ${minHeight}px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background-color: ${appearance === "solid" ? accent : "transparent"};
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover:not(:disabled) {
          background-color: ${appearance === "solid" ? accentHover : tint(10)};
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
        <Text variant="label" color={textColor}>
          {label}
        </Text>
      )}
    </button>
  );
}
