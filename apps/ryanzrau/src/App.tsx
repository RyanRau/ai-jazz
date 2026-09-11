import { useEffect, useState } from "react";
import { css } from "goober";
import {
  AppShell,
  Card,
  Drawer,
  EmptyState,
  Flexbox,
  Header,
  Link,
  Modal,
  SideNav,
  SideNavMobileContext,
  Spinner,
  Text,
  breakpoints,
} from "bluestar";
import type { SideNavItem } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { Landing } from "./Landing";
import { LoginForm } from "./LoginForm";
import { AccountMenu, CollapsedAccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { AdminPage } from "./AdminPage";
import { SettingsPage } from "./SettingsPage";
import { ActivatePage } from "./ActivatePage";
import { pb } from "./pb";

type GrantedApp = { id: string; name: string; url: string; description?: string; icon?: string };

// The fixed footprint lives on this wrapper (a real flex item with a
// declared width), not on Card's own content — Card has no width prop and
// is a plain block child of the wrapper, so it fills whatever width the
// wrapper declares. Falls back to full-width on phones, where a hard
// 240px card would otherwise eat most of the screen.
const cardWrapperClass = css`
  width: 240px;
  @media (max-width: ${breakpoints.sm}px) {
    width: 100%;
  }
`;

// Title and description are truncated/clamped to fit rather than growing
// the card, so cards line up regardless of how long a name or description is.
const appCardClass = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 160px;
  @media (max-width: ${breakpoints.sm}px) {
    height: auto;
  }
`;

const truncateClass = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const clampClass = css`
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const onAppsPath = window.location.pathname === "/apps";
const onAdminPath = window.location.pathname === "/admin";
const onSettingsPath = window.location.pathname === "/settings";
const onActivatePath = window.location.pathname === "/activate";

function App() {
  const record = useAuthRecord();
  const [loginOpen, setLoginOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [apps, setApps] = useState<GrantedApp[] | null>(null);

  useEffect(() => {
    if (!record || !onAppsPath) return;
    // Admins see every app in the catalog, not just their own grants —
    // registry_apps' listRule already permits any signed-in user to read
    // the full catalog, so this needs no backend change.
    // Distinct requestKeys: AppSwitcher fetches from these same endpoints
    // concurrently on this same page, and the PocketBase SDK auto-cancels
    // requests that share a key (by default, method+URL).
    if (record.is_admin) {
      pb.collection("registry_apps")
        .getFullList<GrantedApp>({ requestKey: "ryanzrau-apps" })
        .then(setApps);
      return;
    }
    pb.collection("registry_grants")
      .getFullList({ expand: "app", requestKey: "ryanzrau-grants" })
      .then((grants) => setApps(grants.map((g) => g.expand!.app as GrantedApp)));
  }, [record]);

  if (onActivatePath) {
    // Reachable with no session -- an invited user has none by definition,
    // so this has to come before the signed-out check below.
    return (
      <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
        <Card padding={24}>
          <ActivatePage />
        </Card>
      </Flexbox>
    );
  }

  if (!record) {
    return (
      <>
        <Landing onSignIn={() => setLoginOpen(true)} />

        <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Sign in">
          <LoginForm onSuccess={() => setLoginOpen(false)} />
        </Modal>
      </>
    );
  }

  // Fully replaces hub.ryanzrau.dev, which no longer exists — this app now
  // does everything hub once did.
  const navItems: SideNavItem[] = [
    { key: "apps", label: "Apps", icon: "grid" },
    ...(record.is_admin ? [{ key: "admin", label: "Admin", icon: "user" } as SideNavItem] : []),
  ];
  const sideNav = (
    <SideNav
      items={navItems}
      activeKey={onAdminPath ? "admin" : onAppsPath ? "apps" : ""}
      onSelect={(key) => {
        window.location.href = `/${key}`;
      }}
      top={<AppSwitcher appName="Ryan Rau" />}
      footer={<AccountMenu />}
      collapsedFooter={<CollapsedAccountMenu />}
      defaultCollapsed
    />
  );

  if (onSettingsPath) {
    return (
      <AppShell sideNav={sideNav} maxWidth={640}>
        <SettingsPage record={record} />
      </AppShell>
    );
  }

  if (onAdminPath) {
    return (
      <AppShell sideNav={sideNav}>
        {record.is_admin ? (
          <AdminPage />
        ) : (
          <EmptyState
            title="Admin access required"
            description="Ask an admin if you think you should have access to this page."
          />
        )}
      </AppShell>
    );
  }

  if (onAppsPath) {
    return (
      <AppShell sideNav={sideNav}>
        <Flexbox direction="column" gap={16}>
          <Header variant="h2">Apps</Header>
          {!apps ? (
            <Spinner />
          ) : apps.length === 0 ? (
            <Text variant="body">
              No apps have been granted to your account yet — ask the admin.
            </Text>
          ) : (
            <Flexbox direction="row" flexWrap="wrap" gap={16}>
              {apps.map((a) => (
                <div key={a.id} className={cardWrapperClass}>
                  <Card padding={20}>
                    <div className={appCardClass}>
                      <Flexbox direction="row" alignItems="center" gap={8}>
                        {a.icon && (
                          <span aria-hidden style={{ fontSize: 20, flexShrink: 0 }}>
                            {a.icon}
                          </span>
                        )}
                        <div className={truncateClass}>
                          <Header variant="h3">{a.name}</Header>
                        </div>
                      </Flexbox>
                      {a.description && (
                        <div className={clampClass}>
                          <Text variant="body">{a.description}</Text>
                        </div>
                      )}
                      <Link href={a.url}>Open →</Link>
                    </div>
                  </Card>
                </div>
              ))}
            </Flexbox>
          )}
        </Flexbox>
      </AppShell>
    );
  }

  // Root path, signed in: the same public Landing page signed-out visitors
  // see (this is ryanzrau.dev's home either way), with a hamburger opening
  // the dashboard nav in an overlay instead of a permanent sideNav rail.
  return (
    <>
      <Landing signedIn onOpenMenu={() => setNavOpen(true)} />

      <Drawer isOpen={navOpen} onClose={() => setNavOpen(false)} title="Menu">
        <SideNavMobileContext.Provider value={true}>{sideNav}</SideNavMobileContext.Provider>
      </Drawer>
    </>
  );
}

export default App;
