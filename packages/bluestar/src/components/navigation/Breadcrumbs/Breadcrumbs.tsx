import { css } from "goober";
import { useTheme } from "../../../theme";
import Link from "../Link/Link";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";

export type BreadcrumbItem = {
  label: string;
  /** Omit on the current (last) item — it renders as plain text, not a link. */
  href?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

/**
 * A trail of ancestor pages, chevron-separated, ending in the current page
 * as plain (non-link) text. The last item in `items` is treated as current
 * regardless of whether it has an `href`.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const theme = useTheme();

  return (
    <nav
      aria-label="Breadcrumb"
      className={css`
        display: flex;
        align-items: center;
        gap: 6px;
      `}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div
            key={i}
            className={css`
              display: flex;
              align-items: center;
              gap: 6px;
            `}
          >
            {i > 0 && <Icon name="chevronRight" size={14} color={theme.colors.textMuted} />}
            {isLast || !item.href ? (
              <Text variant="label" color={isLast ? theme.colors.text : theme.colors.textMuted}>
                {item.label}
              </Text>
            ) : (
              // The link's own hover color needs a genuine ancestor color to
              // inherit from (its "muted" variant is `color: inherit`, not a
              // fixed gray) — set it here, then let the label inherit from
              // the link so hover still repaints it.
              <span style={{ color: theme.colors.textMuted }}>
                <Link href={item.href} variant="muted">
                  <Text variant="label" color="inherit" as="span">
                    {item.label}
                  </Text>
                </Link>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
