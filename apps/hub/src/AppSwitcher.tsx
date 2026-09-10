import { useEffect, useState } from "react";
import { css } from "goober";
import { Flexbox, Icon, Menu, MenuItem, Text, useTheme } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb } from "./pb";

type SwitcherApp = { name: string; url: string; icon?: string; description?: string };

// Every user can always get back to the app catalog, even though it isn't
// itself a registry_apps row. Points at ryanzrau.dev/apps rather than the
// old hub.ryanzrau.dev subdomain — hub is being phased out now that this
// page (and /admin) live on the root domain instead.
const HOME: SwitcherApp = {
  name: "Apps",
  url: "https://ryanzrau.dev/apps",
  icon: "🏠",
  description: "Manage your apps and account.",
};

/**
 * Kept in app code rather than bluestar, same reason AccountMenu is: it
 * needs the `pocketbase` package directly, and bluestar must not depend on
 * it (see packages/bluestar/AUDIT.md).
 *
 * Doubles as branding for `SideNav`'s `top` slot -- `appName` renders even
 * with nothing to switch to, so the sidebar always says which app you're
 * in without a separate header bar repeating the same name above it. The
 * switch icon (and its menu) only appears once there's actually another
 * app to jump to.
 */
export function AppSwitcher({ appName }: { appName: string }) {
  const record = useAuthRecord();
  const theme = useTheme();
  const [apps, setApps] = useState<SwitcherApp[]>([]);

  useEffect(() => {
    if (!record) return;
    // Distinct requestKeys: the page's own effect (e.g. hub's dashboard, or
    // stash/tony's access check) fetches from these same endpoints too, and
    // the PocketBase SDK auto-cancels concurrent requests that share a key
    // (by default, method+URL) -- without this, whichever call started
    // second silently aborts the other.
    if (record.is_admin) {
      pb.collection("registry_apps")
        .getFullList<SwitcherApp>({ requestKey: "app-switcher-apps" })
        .then(setApps);
      return;
    }
    pb.collection("registry_grants")
      .getFullList({ expand: "app", requestKey: "app-switcher-grants" })
      .then((grants) => setApps(grants.map((g) => g.expand!.app as SwitcherApp)));
  }, [record]);

  if (!record) return null;

  const entries = [HOME, ...apps];

  return (
    <Flexbox
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      style={{ padding: "10px 12px" }}
    >
      <Text variant="label">{appName}</Text>
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
            {entries.map((app) => (
              <MenuItem
                key={app.url}
                href={app.url}
                icon={app.icon}
                title={app.name}
                subtitle={app.description}
              />
            ))}
          </Flexbox>
        </Menu>
      )}
    </Flexbox>
  );
}
