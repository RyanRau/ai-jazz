import { useEffect, useState } from "react";
import { Flexbox, Icon, Link, Menu } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb } from "./pb";

type SwitcherApp = { name: string; url: string };

// Every user can always get back to the hub, even though it isn't itself a
// registry_apps row.
const HUB: SwitcherApp = { name: "Hub", url: "https://hub.ryanzrau.dev" };

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
    if (record.is_admin) {
      pb.collection("registry_apps")
        .getFullList<SwitcherApp>()
        .then(setApps);
      return;
    }
    pb.collection("registry_grants")
      .getFullList({ expand: "app" })
      .then((grants) => setApps(grants.map((g) => g.expand!.app as SwitcherApp)));
  }, [record]);

  if (!record) return null;

  const entries = [HUB, ...apps];
  if (entries.length <= 1) return null;

  return (
    <Menu trigger={<Icon name="chevronDown" size={16} />} triggerLabel="Switch apps">
      <Flexbox direction="column" gap={4} style={{ padding: "4px 8px" }}>
        {entries.map((app) => (
          <Link key={app.url} href={app.url} variant="muted">
            {app.name}
          </Link>
        ))}
      </Flexbox>
    </Menu>
  );
}
