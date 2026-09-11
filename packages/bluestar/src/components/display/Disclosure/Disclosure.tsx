import { useState } from "react";
import type { ReactNode } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Icon from "../Icon/Icon";
import Text from "../../text/Text/Text";

export type DisclosureProps = {
  /** Always-visible summary text, e.g. "3 tools used". Click (or the chevron) toggles. */
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

/**
 * A single collapsible section -- a chevron + summary label that reveals
 * `children` on click. For an aside that's genuinely optional to read (tool
 * calls behind a chat reply, a raw error's stack trace) rather than content
 * that belongs in the page's normal flow; reach for a plain heading instead
 * of this when the content is always worth showing.
 */
export default function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={css`
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: none;
          padding: 2px 0;
          cursor: pointer;
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
        <span
          style={{
            display: "inline-flex",
            // chevronDown pointing down means "expanded, content is right
            // below"; rotated to point right means "collapsed" -- same
            // convention SideNav's own row chevrons use.
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <Icon name="chevronDown" size={12} />
        </span>
        <Text variant="caption" color={theme.colors.textMuted}>
          {label}
        </Text>
      </button>
      {open && <div style={{ marginTop: 4, paddingLeft: 18 }}>{children}</div>}
    </div>
  );
}
