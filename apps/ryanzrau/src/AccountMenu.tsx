import type { CSSProperties } from "react";
import { Avatar, Button, Flexbox, Icon, Text, ThemePicker } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { pb, signOut } from "./pb";

// ryanzrau.dev hosts the one shared settings page — same hardcoded-URL
// convention pb.ts.tpl already uses for the shared backend.
const SETTINGS_URL = "https://ryanzrau.dev/settings";

const truncateStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/**
 * Kept in app code rather than bluestar: it needs `pb.authStore.record` and
 * `pb.files.getURL`, and bluestar must not depend on the `pocketbase` package
 * (see packages/bluestar/AUDIT.md) — same reason `LoginForm` lives here too.
 *
 * Meant for `SideNav`'s `footer` slot — an always-visible block rather than
 * a dropdown, so it doesn't need `Menu`'s downward-opening panel to fit
 * below a trigger that's pinned at the very bottom of the viewport.
 */
export function AccountMenu() {
  const record = useAuthRecord();
  if (!record) return null;

  const name = record.name || record.email;
  const avatarSrc = record.avatar ? pb.files.getURL(record, record.avatar) : undefined;

  return (
    <Flexbox direction="column" gap={8}>
      <Flexbox direction="row" alignItems="center" gap={8}>
        <Avatar src={avatarSrc} name={name} size={32} />
        <Flexbox direction="column" style={{ minWidth: 0 }}>
          <div style={truncateStyle}>
            <Text variant="label">{name}</Text>
          </div>
          <div style={truncateStyle}>
            <Text variant="caption">{record.email}</Text>
          </div>
        </Flexbox>
      </Flexbox>

      <Flexbox direction="row" gap={4}>
        <Button
          label="Settings"
          aria-label="Settings"
          appearance="text"
          variant="secondary"
          density="dense"
          onClick={() => {
            window.location.href = SETTINGS_URL;
          }}
        >
          <Icon name="settings" size={16} />
        </Button>
        <ThemePicker />
        <Button
          label="Log out"
          aria-label="Log out"
          appearance="text"
          variant="secondary"
          density="dense"
          onClick={signOut}
        >
          <Icon name="logOut" size={16} />
        </Button>
      </Flexbox>
    </Flexbox>
  );
}
