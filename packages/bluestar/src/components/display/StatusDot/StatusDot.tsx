import { css, keyframes } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type StatusDotVariant = "neutral" | "success" | "warning" | "error";

export type StatusDotProps = {
  /** Colour of the dot. Defaults to `"neutral"`. */
  variant?: StatusDotVariant;
  /** Text beside the dot, e.g. "Online". Omit for a bare dot. */
  label?: string;
  /** A soft expanding ring, for a state that's live right now (not a static state like "offline"). Defaults to `false`. */
  pulse?: boolean;
};

const ping = keyframes`
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 50%, transparent); }
  70%  { box-shadow: 0 0 0 6px color-mix(in srgb, currentColor 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 0%, transparent); }
`;

/**
 * A small colored dot + optional label — a live/offline/warning indicator
 * (a server's reachability, a connection state) too minor to warrant a full
 * `Badge` pill. Shares `Badge`'s variant naming and colors so the two read
 * as the same status language.
 */
export default function StatusDot({ variant = "neutral", label, pulse = false }: StatusDotProps) {
  const theme = useTheme();

  const color = {
    neutral: theme.colors.textMuted,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[variant];

  const dot = (
    <span
      aria-hidden="true"
      className={css`
        display: inline-block;
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: ${theme.radius.full};
        background-color: ${color};
        color: ${color};
        ${pulse ? `animation: ${ping} 2s ease-out infinite;` : ""}
      `}
    />
  );

  if (!label) return dot;

  return (
    <Flexbox alignItems="center" gap={8}>
      {dot}
      <Text variant="caption">{label}</Text>
    </Flexbox>
  );
}
