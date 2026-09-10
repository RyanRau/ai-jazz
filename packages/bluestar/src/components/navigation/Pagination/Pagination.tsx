import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Theme } from "../../../theme";
import Icon from "../../display/Icon/Icon";
import Text from "../../text/Text/Text";

export type PaginationProps = {
  /** Current page, 1-indexed. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
};

/**
 * Always shows the first and last page, the current page and its immediate
 * neighbours, and collapses everything else to a single `…` — the same
 * shape Tailwind UI's and MUI's pagination examples converge on.
 */
function buildPageList(page: number, pageCount: number): (number | "ellipsis")[] {
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);

  const list: (number | "ellipsis")[] = [1];
  if (left > 2) list.push("ellipsis");
  for (let i = left; i <= right; i++) list.push(i);
  if (right < pageCount - 1) list.push("ellipsis");
  if (pageCount > 1) list.push(pageCount);
  return list;
}

function pageButtonClass(theme: Theme, isActive: boolean) {
  return css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 6px;
    border-radius: ${theme.radius.sm};
    border: 1px solid ${isActive ? theme.colors.primary : "transparent"};
    background: none;
    color: ${isActive ? theme.colors.primary : theme.colors.text};
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.surfaceHover};
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.focusRing};
      outline-offset: 2px;
    }
  `;
}

export default function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const theme = useTheme();
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={css`
        display: flex;
        align-items: center;
        gap: 4px;
      `}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={pageButtonClass(theme, false)}
      >
        <Icon name="chevronLeft" size={16} />
      </button>

      {buildPageList(page, pageCount).map((entry, i) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className={css`
              display: flex;
              align-items: center;
              justify-content: center;
              min-width: 32px;
              height: 32px;
            `}
          >
            <Text variant="caption" color={theme.colors.textMuted}>
              …
            </Text>
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
            className={pageButtonClass(theme, entry === page)}
          >
            <Text variant="label" color="inherit">
              {entry}
            </Text>
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={pageButtonClass(theme, false)}
      >
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
