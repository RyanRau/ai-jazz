import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";

export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertProps = {
  /** Tone of the message. Defaults to `"info"`. */
  variant?: AlertVariant;
  /** Optional bold heading above the message. */
  title?: string;
  children: ReactNode;
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void;
};

export default function Alert({ variant = "info", title, children, onDismiss }: AlertProps) {
  const theme = useTheme();

  const accent = {
    info: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={css`
        /* Tinting with color-mix keeps this to one token per tone instead of a
           parallel set of background colours, and it re-tints itself in dark
           mode because the inputs are both variables. */
        background-color: color-mix(in srgb, ${accent} 12%, ${theme.colors.background});
        border: 1px solid color-mix(in srgb, ${accent} 40%, ${theme.colors.background});
        border-left: 3px solid ${accent};
        border-radius: ${theme.radius.md};
        padding: 12px 16px;
      `}
    >
      <Flexbox direction="row" gap={12} alignItems="flex-start" justifyContent="space-between">
        <Flexbox direction="column" gap={4}>
          {title && (
            <Text variant="label" color={accent}>
              <strong>{title}</strong>
            </Text>
          )}
          {/* `as="div"`, not the default `"p"` -- a real alert body often
              needs richer content than inline text (an action button, its
              own layout), which a `<p>` can't legally contain. */}
          <Text variant="body" as="div">
            {children}
          </Text>
        </Flexbox>

        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className={css`
              background: none;
              border: none;
              cursor: pointer;
              display: flex;
              padding: 0 4px;
              color: ${theme.colors.textMuted};
              &:hover {
                color: ${theme.colors.text};
              }
              &:focus-visible {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </Flexbox>
    </div>
  );
}
