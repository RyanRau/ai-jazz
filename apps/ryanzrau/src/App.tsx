import { useEffect, useState } from "react";
import { css } from "goober";
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Flexbox,
  Header,
  Link,
  Modal,
  SideNav,
  Spinner,
  Text,
  breakpoints,
} from "bluestar";
import type { SideNavItem } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
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

  // The eventual resume — public regardless of sign-in state. Signed in
  // adds the sidebar (Apps, Settings, Admin) around it; signed out it's
  // just this.
  const landing = (
    <Flexbox direction="column" alignItems="center" gap={24} style={{ padding: 32 }}>
      <Card padding={24}>
        <Flexbox direction="column" gap={8}>
          <Header variant="h1">Howdy 🤠</Header>
          <Text variant="body">
            Welcome! This is Ryan Rau's site.
            {!record && " Sign in to reach the dashboard and its apps."}
          </Text>
        </Flexbox>
      </Card>
    </Flexbox>
  );

  if (!record) {
    return (
      <AppShell
        title="Ryan Rau"
        account={
          <Button
            label="Sign in"
            variant="secondary"
            density="dense"
            onClick={() => setLoginOpen(true)}
          />
        }
      >
        {landing}

        <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Sign in">
          <LoginForm onSuccess={() => setLoginOpen(false)} />
        </Modal>
      </AppShell>
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

  return <AppShell sideNav={sideNav}>{landing}</AppShell>;
}

export default App;
