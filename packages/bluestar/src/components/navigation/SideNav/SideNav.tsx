import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";
import type { IconName } from "../../display/Icon/Icon";

export type SideNavItem = {
  key: string;
  label: string;
  /** Shown at all times, including collapsed (icon-only) width. */
  icon?: IconName;
  /**
   * Rendered indented directly below this item, only while it's expanded —
   * a sub-section for a page that has its own short list of things to jump
   * to (a chat's recent conversations, say). Keep it short: this expands
   * the rail's own natural height rather than scrolling on its own, so a
   * handful of rows is the right size — cap a longer list and link to a
   * dedicated page for the rest, the way `ListRow` already reads as "a
   * chat list" for exactly that page.
   *
   * Presence of `expandedContent` is what makes the row collapsible at
   * all: it gets a trailing chevron, and starts expanded automatically the
   * first time this item becomes `activeKey` — toggle it manually after
   * that with the chevron, independent of navigating elsewhere and back
   * (which re-expands it, on the assumption that navigating back to a
   * section means wanting to see it again).
   */
  expandedContent?: ReactNode;
  /**
   * A small icon-button action pinned to the end of the row, next to the
   * expand chevron (or in its place, if there's no `expandedContent`) — for
   * a quick action tied to this section (e.g. "start a new one") that
   * shouldn't require expanding the section first. Independent of
   * navigation and expansion: clicking it only ever fires `onClick`, never
   * `onSelect` or the chevron's toggle. Hidden while the rail is collapsed
   * to its icon-only width, same as the label.
   */
  action?: { icon: IconName; label: string; onClick: () => void };
};

export type SideNavProps = {
  /** Defaults to `[]` — a chrome-only rail (just `top`/`footer`) is a real case for a single-page app with nothing to switch between. */
  items?: SideNavItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  /**
   * Rendered above the nav items — an app switcher, a brand mark. Hidden
   * (not just squeezed) while collapsed, same as `footer`: arbitrary content
   * can't shrink to the 64px icon-only rail the way a `SideNavItem`'s own
   * label does.
   */
  top?: ReactNode;
  /**
   * Rendered pinned to the bottom of the rail, above a top border — an
   * account/profile block. Hidden while collapsed; expand to reach it,
   * unless `collapsedFooter` gives it an icon-only stand-in.
   */
  footer?: ReactNode;
  /**
   * Rendered in `footer`'s place while collapsed — a compact,
   * icon-only version (e.g. an avatar + a log-out button) for the pieces
   * of `footer` that still need to be reachable at the 64px rail width.
   * Omit to keep the current behavior of hiding `footer` entirely.
   */
  collapsedFooter?: ReactNode;
  /** localStorage key for remembering the collapsed state. Pass `null` to disable persistence. */
  storageKey?: string | null;
  /**
   * Initial collapsed state before any `storageKey` value has been stored
   * (i.e. a visitor's first time on this device). Once a value is stored,
   * that value wins regardless of this prop. Defaults to `false`.
   */
  defaultCollapsed?: boolean;
};

const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";
const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 64;
const TOGGLE_SIZE = 24;

function readStored(storageKey: string | null | undefined, defaultCollapsed: boolean): boolean {
  if (!canUseDOM || !storageKey) return defaultCollapsed;
  const stored = window.localStorage.getItem(storageKey);
  return stored === null ? defaultCollapsed : stored === "1";
}

/**
 * Set by `AppShell` around the copy of `sideNav` it renders inside its own
 * mobile drawer (never the permanent desktop rail) — full-width and
 * always-expanded there isn't a `SideNav` prop apps pass themselves, it's
 * purely a function of which of AppShell's two rendering contexts a given
 * instance is in. Exported so a page that renders `SideNav` inside its own
 * overlay instead of `AppShell` (e.g. a custom, non-`AppShell` layout that
 * still wants the same "hamburger opens the app's nav" pattern) can opt into
 * the same full-width, non-collapsible treatment by wrapping its `SideNav`
 * in `<SideNavMobileContext.Provider value={true}>`.
 */
export const SideNavMobileContext = createContext(false);

/**
 * A persistent left rail for switching between an app's top-level pages,
 * collapsible to an icon-only strip. Meant for `AppShell`'s `sideNav` slot,
 * which locks it to the true left edge and its own height rather than
 * placing it inside the centred content column.
 *
 * `top` (an app switcher, a brand mark) and `footer` (an account/profile
 * block, pinned to the bottom above a divider) turn the rail into the full
 * app chrome — the header is then free to carry just the page title, no
 * account avatar or app switcher of its own. `items` is optional: a
 * single-page app can render `SideNav` for just its `top`/`footer` chrome
 * with nothing to switch between.
 *
 * The collapse toggle is a small circular handle straddling the rail's
 * right border at vertical centre -- the convention most dashboard
 * component libraries (Bootstrap, Tailwind UI) use, rather than a
 * full-width row at the bottom.
 *
 * Collapsed state persists to localStorage the same way `useColorScheme`
 * persists its own choice — `defaultCollapsed` only decides the very first
 * render before any value has been stored.
 */
export default function SideNav({
  items = [],
  activeKey = "",
  onSelect = () => {},
  top,
  footer,
  collapsedFooter,
  storageKey = "bluestar-sidenav-collapsed",
  defaultCollapsed = false,
}: SideNavProps) {
  const theme = useTheme();
  const isMobileDrawer = useContext(SideNavMobileContext);
  const [collapsedState, setCollapsed] = useState(() => readStored(storageKey, defaultCollapsed));
  // Full-width and always-expanded in the mobile drawer -- a collapsed,
  // icon-only rail makes no sense floating full-screen on a touch device,
  // and there's no edge to collapse toward.
  const collapsed = isMobileDrawer ? false : collapsedState;
  // Items whose `expandedContent` has been manually collapsed by the
  // chevron while active. Not persisted -- re-selecting the item (or
  // navigating back to it) clears its entry here, so it re-expands.
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!canUseDOM || !storageKey) return;
    window.localStorage.setItem(storageKey, collapsedState ? "1" : "0");
  }, [collapsedState, storageKey]);

  return (
    <nav
      aria-label="Sections"
      className={css`
        position: relative;
        width: ${isMobileDrawer ? "100%" : `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`};
        height: 100%;
        flex-shrink: 0;
        border-right: 1px solid ${theme.colors.border};
        background-color: ${theme.colors.surface};
        display: flex;
        flex-direction: column;
        transition: width 0.15s ease;
      `}
    >
      {top && !collapsed && (
        <div
          className={css`
            padding: 8px 8px 0 8px;
          `}
        >
          {top}
        </div>
      )}

      <Flexbox direction="column" gap={4} style={{ padding: 8, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const isActive = item.key === activeKey;
          // A left accent bar + tinted background reads as "selected" without
          // the item becoming a solid, pill-like block — closer to how a
          // flat dashboard rail (MUI's Drawer, Tailwind UI's sidebar) marks
          // the current section than a fully filled row does.
          const fg = isActive ? theme.colors.primary : theme.colors.text;
          const ACCENT_WIDTH = 3;
          const hasExpandable = Boolean(item.expandedContent);
          const isExpanded = hasExpandable && isActive && !collapsedItems.has(item.key);
          return (
            <div key={item.key}>
              <div
                className={css`
                  display: flex;
                  align-items: center;
                  width: 100%;
                  border-left: ${ACCENT_WIDTH}px solid
                    ${isActive ? theme.colors.primary : "transparent"};
                  border-radius: 0 ${theme.radius.sm} ${theme.radius.sm} 0;
                  background-color: ${
                    isActive
                      ? `color-mix(in srgb, ${theme.colors.primary} 12%, transparent)`
                      : "transparent"
                  };

                  &:hover {
                    background-color: ${
                      isActive
                        ? `color-mix(in srgb, ${theme.colors.primary} 18%, transparent)`
                        : theme.colors.surfaceHover
                    };
                  }
                `}
              >
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    onSelect(item.key);
                    // Selecting an item re-expands it -- navigating back to a
                    // section means wanting to see its expanded content again,
                    // regardless of whether the chevron had collapsed it.
                    if (hasExpandable && collapsedItems.has(item.key)) {
                      setCollapsedItems((prev) => {
                        const next = new Set(prev);
                        next.delete(item.key);
                        return next;
                      });
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                  className={css`
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                    min-width: 0;
                    padding: 10px 4px 10px ${12 - ACCENT_WIDTH}px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    text-align: left;
                    white-space: nowrap;

                    &:focus-visible {
                      outline: 2px solid ${theme.colors.focusRing};
                      outline-offset: 2px;
                    }
                  `}
                >
                  {item.icon && <Icon name={item.icon} size={18} color={fg} />}
                  {!collapsed && (
                    <Text variant="label" color={fg}>
                      {item.label}
                    </Text>
                  )}
                </button>

                {!collapsed && item.action && (
                  <button
                    type="button"
                    aria-label={item.action.label}
                    title={item.action.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action?.onClick();
                    }}
                    className={css`
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 28px;
                      height: 28px;
                      flex-shrink: 0;
                      border: none;
                      border-radius: ${theme.radius.sm};
                      background: none;
                      cursor: pointer;
                      color: ${theme.colors.textMuted};

                      &:hover {
                        color: ${theme.colors.text};
                        background-color: ${theme.colors.surfaceHover};
                      }
                      &:focus-visible {
                        outline: 2px solid ${theme.colors.focusRing};
                        outline-offset: 2px;
                      }
                    `}
                  >
                    <Icon name={item.action.icon} size={16} />
                  </button>
                )}

                {!collapsed && hasExpandable && (
                  <button
                    type="button"
                    aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                    aria-expanded={isExpanded}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsedItems((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.add(item.key);
                        else next.delete(item.key);
                        return next;
                      });
                    }}
                    className={css`
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 28px;
                      height: 28px;
                      flex-shrink: 0;
                      margin-right: 4px;
                      border: none;
                      border-radius: ${theme.radius.sm};
                      background: none;
                      cursor: pointer;
                      color: ${theme.colors.textMuted};

                      &:hover {
                        color: ${theme.colors.text};
                        background-color: ${theme.colors.surfaceHover};
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
                        // chevronDown pointing down means "expanded, content
                        // is right below"; rotated to point right means
                        // "collapsed, click to reveal".
                        transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <Icon name="chevronDown" size={14} />
                    </span>
                  </button>
                )}
              </div>

              {isExpanded && !collapsed && (
                <div
                  className={css`
                    padding-left: ${ACCENT_WIDTH}px;
                  `}
                >
                  {item.expandedContent}
                </div>
              )}
            </div>
          );
        })}
      </Flexbox>

      {footer && !collapsed && (
        <div
          className={css`
            padding: 12px 8px;
            border-top: 1px solid ${theme.colors.border};
          `}
        >
          {footer}
        </div>
      )}

      {collapsedFooter && collapsed && (
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px 8px;
            border-top: 1px solid ${theme.colors.border};
          `}
        >
          {collapsedFooter}
        </div>
      )}

      {!isMobileDrawer && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={css`
            position: absolute;
            top: 50%;
            right: -${TOGGLE_SIZE / 2}px;
            transform: translateY(-50%);
            width: ${TOGGLE_SIZE}px;
            height: ${TOGGLE_SIZE}px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 1px solid ${theme.colors.border};
            background-color: ${theme.colors.background};
            box-shadow: ${theme.shadow.sm};
            cursor: pointer;
            color: ${theme.colors.textMuted};
            padding: 0;

            &:hover {
              color: ${theme.colors.text};
              border-color: ${theme.colors.borderStrong};
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
              // chevronDown rotated: -90deg points right (expand), 90deg points left (collapse).
              transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <Icon name="chevronDown" size={12} />
          </span>
        </button>
      )}
    </nav>
  );
}
