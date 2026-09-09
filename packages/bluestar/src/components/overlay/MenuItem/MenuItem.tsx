import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type MenuItemProps = {
  /** Leading glyph — an emoji string works fine as a plain ReactNode. */
  icon?: ReactNode;
  /** Primary label. */
  title: string;
  /** Secondary line below the title. Truncated to one line internally. */
  subtitle?: string;
  /** Renders as a link. Provide this or `onClick`, not both. */
  href?: string;
  /** Renders as a button. */
  onClick?: () => void;
};

/**
 * A clickable row for `Menu` content — icon, title, optional subtitle, with
 * a block hover/focus highlight. `Menu` itself imposes no styling on its
 * children, so this is what makes a list of entries feel like a picker
 * rather than plain links in a box.
 */
export default function MenuItem({ icon, title, subtitle, href, onClick }: MenuItemProps) {
  const theme = useTheme();

  const itemClass = css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    background: none;
    border-radius: ${theme.radius.sm};
    color: inherit;
    text-decoration: none;
    font-family: ${theme.fonts.body};
    cursor: pointer;
    text-align: left;

    &:hover,
    &:focus-visible {
      background-color: ${theme.colors.surfaceHover};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.focusRing};
      outline-offset: 2px;
    }
  `;

  const content = (
    <>
      {icon && (
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <Flexbox direction="column" gap={4} style={{ minWidth: 0, flex: 1 }}>
        <Text variant="label">{title}</Text>
        {subtitle && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            <Text variant="caption">{subtitle}</Text>
          </div>
        )}
      </Flexbox>
    </>
  );

  if (href) {
    return (
      <a href={href} className={itemClass}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={itemClass}>
      {content}
    </button>
  );
}
