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
        width: ${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px;
        flex-shrink: 0;
        border-right: 1px solid ${theme.colors.border};
        background-color: ${theme.colors.surface};
        display: flex;
        flex-direction: column;
        transition: width 0.15s ease;
        overflow: hidden;
      `}
    >
      <Flexbox direction="column" gap={4} style={{ padding: 8, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const isActive = item.key === activeKey;
          const fg = isActive ? theme.colors.textOnAccent : theme.colors.text;
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
                padding: 10px 12px;
                border: none;
                border-radius: ${theme.radius.md};
                background-color: ${isActive ? theme.colors.primary : "transparent"};
                cursor: pointer;
                text-align: left;
                white-space: nowrap;

                &:hover {
                  background-color: ${isActive ? theme.colors.primaryHover : theme.colors.surfaceHover};
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

      <div style={{ padding: 8 }}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={css`
            display: flex;
            align-items: center;
            justify-content: ${collapsed ? "center" : "flex-end"};
            width: 100%;
            padding: 8px;
            border: none;
            background: transparent;
            border-radius: ${theme.radius.md};
            cursor: pointer;
            color: ${theme.colors.textMuted};

            &:hover {
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
              // chevronDown rotated: -90deg points right (expand), 90deg points left (collapse).
              transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <Icon name="chevronDown" size={16} />
          </span>
        </button>
      </div>
    </nav>
  );
}
