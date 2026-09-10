import { useEffect, useState } from "react";
import { css } from "goober";
import { Flexbox, Icon, Menu, MenuItem, Text, useTheme } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb } from "./pb";

type SwitcherApp = { name: string; url: string; icon?: string; description?: string };

// Every user can always get back to the hub, even though it isn't itself a
// registry_apps row.
const HUB: SwitcherApp = {
  name: "Hub",
  url: "https://hub.ryanzrau.dev",
  icon: "🏠",
  description: "Manage your apps and account.",
};

/**
 * Kept in app code rather than bluestar, same reason AccountMenu is: it
 * needs the `pocketbase` package directly, and bluestar must not depend on
 * it (see packages/bluestar/AUDIT.md).
 */
export function AppSwitcher() {
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

  const entries = [HUB, ...apps];
  if (entries.length <= 1) return null;

  return (
    // A column Flexbox rather than the row AppShell's header used to hold
    // this in: with only one child, its default cross-axis stretch is what
    // makes Menu's own (shrink-to-fit) trigger button fill the sidebar's
    // width — Menu itself stays untouched, so a future compact trigger
    // elsewhere isn't forced to stretch too.
    <Flexbox direction="column" width="100%">
      <Menu
        trigger={
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              padding: 10px 12px;
              border-radius: ${theme.radius.sm};

              &:hover {
                background-color: ${theme.colors.surfaceHover};
              }
            `}
          >
            <Text variant="label">Switch apps</Text>
            <Icon name="chevronDown" size={14} color={theme.colors.textMuted} />
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
    </Flexbox>
  );
}
