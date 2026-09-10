import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type ListRowProps = {
  /** Primary line. */
  title: string;
  /** Secondary line beneath the title — a timestamp, an owner, etc. */
  subtitle?: string;
  /** Rendered inline after the title — typically a `Badge`. */
  badge?: ReactNode;
  /** Dims the title, e.g. for a revoked/archived row that stays clickable. Takes precedence over the selected color. */
  muted?: boolean;
  selected: boolean;
  onClick: () => void;
};

/**
 * One row in a selectable list — a master-detail sidebar (an API key list,
 * a chat list). Selection reads the same way `SideNav`'s does: a left
 * accent bar + tinted background, so "this is the current pick" looks the
 * same everywhere in the library, not just in the permanent app rail.
 */
export default function ListRow({
  title,
  subtitle,
  badge,
  muted,
  selected,
  onClick,
}: ListRowProps) {
  const theme = useTheme();
  const ACCENT_WIDTH = 3;
  const titleColor = muted ? theme.colors.textMuted : selected ? theme.colors.primary : undefined;

  return (
    <button
      type="button"
      aria-current={selected || undefined}
      onClick={onClick}
      className={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        text-align: left;
        padding: 8px 10px 8px ${10 - ACCENT_WIDTH}px;
        border: none;
        border-left: ${ACCENT_WIDTH}px solid ${selected ? theme.colors.primary : "transparent"};
        border-radius: 0 ${theme.radius.sm} ${theme.radius.sm} 0;
        background-color: ${
          selected ? `color-mix(in srgb, ${theme.colors.primary} 12%, transparent)` : "transparent"
        };
        cursor: pointer;

        &:hover {
          background-color: ${
            selected
              ? `color-mix(in srgb, ${theme.colors.primary} 18%, transparent)`
              : theme.colors.surfaceHover
          };
        }
        &:focus-visible {
          outline: 2px solid ${theme.colors.focusRing};
          outline-offset: 2px;
        }
      `}
    >
      <Flexbox gap={4} alignItems="center">
        <Text variant="subtitle" color={titleColor}>
          {title}
        </Text>
        {badge}
      </Flexbox>
      {subtitle && <Text variant="caption">{subtitle}</Text>}
    </button>
  );
}
