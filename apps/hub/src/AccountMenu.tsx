import { Avatar, Button, Flexbox, Link, Menu, Text } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb, signOut } from "./pb";

// hub.ryanzrau.dev hosts the one shared settings page — same hardcoded-URL
// convention pb.ts.tpl already uses for the shared backend.
const SETTINGS_URL = "https://hub.ryanzrau.dev/settings";

/**
 * Kept in app code rather than bluestar: it needs `pb.authStore.record` and
 * `pb.files.getURL`, and bluestar must not depend on the `pocketbase` package
 * (see packages/bluestar/AUDIT.md) — same reason `LoginForm` lives here too.
 */
export function AccountMenu() {
  const record = useAuthRecord();
  if (!record) return null;

  const name = record.name || record.email;
  const avatarSrc = record.avatar ? pb.files.getURL(record, record.avatar) : undefined;

  return (
    <Menu
      trigger={<Avatar src={avatarSrc} name={name} />}
      triggerLabel={`Account menu for ${name}`}
    >
      <Flexbox direction="column" gap={12}>
        <Flexbox direction="column" gap={4} style={{ padding: "4px 8px" }}>
          <Text variant="label">{record.name || "—"}</Text>
          <Text variant="caption">{record.email}</Text>
        </Flexbox>
        <div style={{ padding: "0 8px" }}>
          <Link href={SETTINGS_URL} variant="muted">
            Settings
          </Link>
        </div>
        <Button label="Log out" variant="secondary" density="dense" onClick={signOut} />
      </Flexbox>
    </Menu>
  );
}
