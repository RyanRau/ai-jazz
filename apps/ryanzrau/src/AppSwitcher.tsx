import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppSwitcher as BluestarAppSwitcher } from "bluestar";
import type { AppSwitcherEntry } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb } from "./pb";

type SwitcherApp = { slug: string; name: string; url: string; description?: string };

// Every user can always get back to the app catalog, even though it isn't
// itself a registry_apps row. Points at ryanzrau.dev/apps rather than the
// old hub.ryanzrau.dev subdomain — hub is being phased out now that this
// page (and /admin) live on the root domain instead. slug: "apps" is the
// shared catalog sentinel bluestar's own AppIcon resolves to its grid icon
// (the same one SideNav's own Apps item uses).
const HOME: SwitcherApp = {
  slug: "apps",
  name: "Apps",
  url: "https://ryanzrau.dev/apps",
  description: "Manage your apps and account.",
};

/**
 * Kept in app code rather than bluestar, same reason AccountMenu is: it
 * needs the `pocketbase` package directly, and bluestar must not depend on
 * it (see packages/bluestar/AUDIT.md). Just fetches this viewer's apps and
 * hands them to bluestar's shared `AppSwitcher` for rendering.
 */
export function AppSwitcher({ appName, icon }: { appName: string; icon: ReactNode }) {
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

  const entries: AppSwitcherEntry[] = [HOME, ...apps].map((app) => ({
    slug: app.slug,
    title: app.name,
    subtitle: app.description,
    href: app.url,
  }));

  return <BluestarAppSwitcher appName={appName} icon={icon} entries={entries} />;
}
