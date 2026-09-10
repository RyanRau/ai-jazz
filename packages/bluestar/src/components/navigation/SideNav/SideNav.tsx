import { useEffect, useState } from "react";
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
};

export type SideNavProps = {
  items: SideNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** localStorage key for remembering the collapsed state. Pass `null` to disable persistence. */
  storageKey?: string | null;
};

const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";
const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 64;
const TOGGLE_SIZE = 24;

function readStored(storageKey: string | null | undefined): boolean {
  if (!canUseDOM || !storageKey) return false;
  return window.localStorage.getItem(storageKey) === "1";
}

/**
 * A persistent left rail for switching between an app's top-level pages,
 * collapsible to an icon-only strip. Meant for `AppShell`'s `sideNav` slot,
 * which locks it to the true left edge and its own height rather than
 * placing it inside the centred content column.
 *
 * The collapse toggle is a small circular handle straddling the rail's
 * right border at vertical centre -- the convention most dashboard
 * component libraries (Bootstrap, Tailwind UI) use, rather than a
 * full-width row at the bottom.
 *
 * Collapsed state persists to localStorage the same way `useColorScheme`
 * persists its own choice.
 */
export default function SideNav({
  items,
  activeKey,
  onSelect,
  storageKey = "bluestar-sidenav-collapsed",
}: SideNavProps) {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(() => readStored(storageKey));

  useEffect(() => {
    if (!canUseDOM || !storageKey) return;
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed, storageKey]);

  return (
    <nav
      aria-label="Sections"
      className={css`
        position: relative;
        width: ${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px;
        flex-shrink: 0;
        border-right: 1px solid ${theme.colors.border};
        background-color: ${theme.colors.surface};
        display: flex;
        flex-direction: column;
        transition: width 0.15s ease;
      `}
    >
      <Flexbox direction="column" gap={4} style={{ padding: 8, flex: 1, overflow: "hidden" }}>
        {items.map((item) => {
          const isActive = item.key === activeKey;
          // A left accent bar + tinted background reads as "selected" without
          // the item becoming a solid, pill-like block — closer to how a
          // flat dashboard rail (MUI's Drawer, Tailwind UI's sidebar) marks
          // the current section than a fully filled row does.
          const fg = isActive ? theme.colors.primary : theme.colors.text;
          const ACCENT_WIDTH = 3;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
              className={css`
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 10px 12px 10px ${12 - ACCENT_WIDTH}px;
                border: none;
                border-left: ${ACCENT_WIDTH}px solid
                  ${isActive ? theme.colors.primary : "transparent"};
                border-radius: 0 ${theme.radius.sm} ${theme.radius.sm} 0;
                background-color: ${
                  isActive
                    ? `color-mix(in srgb, ${theme.colors.primary} 12%, transparent)`
                    : "transparent"
                };
                cursor: pointer;
                text-align: left;
                white-space: nowrap;

                &:hover {
                  background-color: ${
                    isActive
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
              {item.icon && <Icon name={item.icon} size={18} color={fg} />}
              {!collapsed && (
                <Text variant="label" color={fg}>
                  {item.label}
                </Text>
              )}
            </button>
          );
        })}
      </Flexbox>

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
    </nav>
  );
}
