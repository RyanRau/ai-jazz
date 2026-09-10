import { css } from "goober";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";
import type { IconName } from "../../display/Icon/Icon";

export type TabItem = {
  key: string;
  label: string;
  icon?: IconName;
};

export type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

/**
 * A flat, underline-selected tab row — the flat-dashboard counterpart to
 * `SideNav`'s left-accent-bar selection, for switching between views within
 * a page rather than between an app's top-level sections.
 */
export default function Tabs({ items, activeKey, onSelect }: TabsProps) {
  const theme = useTheme();

  return (
    <div
      role="tablist"
      className={css`
        display: flex;
        gap: 4px;
        border-bottom: 1px solid ${theme.colors.border};
      `}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const fg = isActive ? theme.colors.primary : theme.colors.textMuted;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.key)}
            className={css`
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 4px;
              margin-bottom: -1px;
              border: none;
              border-bottom: 2px solid ${isActive ? theme.colors.primary : "transparent"};
              background: none;
              cursor: pointer;

              &:hover {
                color: ${theme.colors.text};
              }
              &:focus-visible {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            {item.icon && <Icon name={item.icon} size={16} color={fg} />}
            <Text variant="label" color={fg}>
              {item.label}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
