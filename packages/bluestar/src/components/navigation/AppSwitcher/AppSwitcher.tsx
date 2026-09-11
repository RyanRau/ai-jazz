import type { ReactNode } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";
import AppIcon from "../../display/AppIcon/AppIcon";
import Menu from "../../overlay/Menu/Menu";
import MenuItem from "../../overlay/MenuItem/MenuItem";

export type AppSwitcherEntry = {
  /** A `registry_apps` slug (or the `"apps"` catalog sentinel) — resolves to `AppIcon`'s drawing for it. */
  slug: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type AppSwitcherProps = {
  /** This app's own name, shown in the branding row. */
  appName: string;
  /** This app's own brand mark, shown before `appName`. Omit for text-only branding. */
  icon?: ReactNode;
  /**
   * Every destination the switch menu should list, self included if it
   * belongs there (most apps also list a link back to the shared catalog —
   * build that into this array rather than assuming one). The trigger
   * (and the whole menu) only renders once there's more than one entry —
   * nothing to switch *to* means nothing to show.
   */
  entries: AppSwitcherEntry[];
};

/**
 * Branding + a switcher for `SideNav`'s `top` slot — the piece every app in
 * a shared registry (`registry_apps` in PocketBase) needs, and needs to
 * look identical everywhere it shows up. Deliberately presentational: data
 * fetching (which apps a signed-in viewer may see) stays in a thin
 * per-app wrapper, since bluestar must not depend on the `pocketbase`
 * package (see `packages/bluestar/AUDIT.md`) — that wrapper's whole job is
 * building `entries` from the app's own registry query and handing them
 * here, the same split `LoginForm`/`AccountMenu` already use for the same
 * reason.
 */
export default function AppSwitcher({ appName, icon, entries }: AppSwitcherProps) {
  const theme = useTheme();

  return (
    <Flexbox
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      style={{ padding: "10px 12px" }}
    >
      <Flexbox direction="row" alignItems="center" gap={8} style={{ minWidth: 0 }}>
        {icon}
        <Text variant="label">{appName}</Text>
      </Flexbox>
      {entries.length > 1 && (
        <Menu
          trigger={
            <div
              className={css`
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px;
                border-radius: ${theme.radius.sm};

                &:hover {
                  background-color: ${theme.colors.surfaceHover};
                }
              `}
            >
              <Icon name="switch" size={16} color={theme.colors.textMuted} />
            </div>
          }
          triggerLabel="Switch apps"
          width={280}
        >
          <Flexbox direction="column" gap={4}>
            {entries.map((entry) => (
              <MenuItem
                key={entry.href}
                href={entry.href}
                icon={<AppIcon slug={entry.slug} size={18} color={theme.colors.textMuted} />}
                title={entry.title}
                subtitle={entry.subtitle}
              />
            ))}
          </Flexbox>
        </Menu>
      )}
    </Flexbox>
  );
}
