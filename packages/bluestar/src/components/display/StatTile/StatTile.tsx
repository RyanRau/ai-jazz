import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type StatTileProps = {
  /** Sentence case, no trailing colon. */
  label: string;
  /** Auto-compact by the caller if desired (e.g. "12.9K") -- this component doesn't reformat it. */
  value: string;
};

/**
 * A single headline number: label, then value in a large proportional
 * (not tabular) figure -- tabular-nums is for columns that must align
 * vertically, not a standalone big number, which just looks loose.
 */
export default function StatTile({ label, value }: StatTileProps) {
  const theme = useTheme();
  return (
    <Flexbox
      direction="column"
      gap={4}
      style={{
        padding: 16,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
      }}
    >
      <Text variant="caption">{label}</Text>
      <span
        className={css`
          font-family: ${theme.fonts.body};
          font-size: 28px;
          font-weight: 700;
          font-variant-numeric: proportional-nums;
          color: ${theme.colors.text};
        `}
      >
        {value}
      </span>
    </Flexbox>
  );
}
