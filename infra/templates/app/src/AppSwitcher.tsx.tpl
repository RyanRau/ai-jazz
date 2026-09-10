import { useEffect, useState } from "react";
import { Flexbox, Icon, Menu, MenuItem } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb } from "./pb";

type SwitcherApp = { name: string; url: string; icon?: string; description?: string };

// Every user can always get back to the app catalog, even though it isn't
// itself a registry_apps row.
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
 */
export function AppSwitcher() {
  const record = useAuthRecord();
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
  if (entries.length <= 1) return null;

  return (
    <Menu trigger={<Icon name="chevronDown" size={16} />} triggerLabel="Switch apps" width={320}>
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
  );
}
