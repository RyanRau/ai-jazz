import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type MeterProps = {
  /** Sentence case, no trailing colon. */
  label: string;
  /** Current amount, in the same unit as `max`. */
  value: number;
  /** The amount that represents "full". */
  max: number;
  /** Formats the value/max pair shown to the right of the label. Defaults to `formatCompact(value) / formatCompact(max)`. */
  formatValue?: (value: number, max: number) => string;
};

function formatCompact(n: number): string {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/**
 * A labeled horizontal fill bar for "how much of a fixed budget is used" --
 * context-window usage, a storage quota, anything with a hard ceiling
 * rather than an open-ended count (that's `StatTile`). Fill color shifts
 * from `primary` to `warning` at 70% and `error` at 90%, since a caller
 * showing this is almost always about to ask "is it time to do something
 * about this yet."
 */
export default function Meter({ label, value, max, formatValue }: MeterProps) {
  const theme = useTheme();
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const color =
    fraction >= 0.9
      ? theme.colors.error
      : fraction >= 0.7
        ? theme.colors.warning
        : theme.colors.primary;

  return (
    <Flexbox direction="column" gap={4}>
      <Flexbox justifyContent="space-between" alignItems="center">
        <Text variant="caption">{label}</Text>
        <Text variant="caption" color={theme.colors.textMuted}>
          {formatValue
            ? formatValue(value, max)
            : `${formatCompact(value)} / ${formatCompact(max)}`}
        </Text>
      </Flexbox>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemax={max}
        className={css`
          width: 100%;
          height: 6px;
          border-radius: ${theme.radius.full};
          background-color: ${theme.colors.surfaceHover};
          overflow: hidden;
        `}
      >
        <div
          className={css`
            width: ${fraction * 100}%;
            height: 100%;
            border-radius: ${theme.radius.full};
            background-color: ${color};
            transition: width 0.2s ease;
          `}
        />
      </div>
    </Flexbox>
  );
}
