import { useEffect, useState } from "react";
import { ClientResponseError } from "pocketbase";
import {
  Alert,
  AsyncButton,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Flexbox,
  Form,
  Header,
  Icon,
  Modal,
  Spinner,
  SubmitButton,
  Table,
  Text,
  TextInput,
  TokenSelect,
  useForm,
  useToast,
} from "bluestar";
import { pb } from "./pb";

type AdminUser = { id: string; email: string; name: string; verified: boolean };
type AdminApp = { id: string; slug: string; name: string };
type AdminGrant = { user: string; app: string };
type AccessData = { users: AdminUser[]; apps: AdminApp[]; grants: AdminGrant[] };
type InviteResult = { link: string; sent: boolean; email: string };

function grantKey(userId: string, appId: string) {
  return `${userId}:${appId}`;
}

type InviteFormValues = { email: string; apps: Record<string, boolean> };

function InviteForm({
  apps,
  pendingEmails,
  onDone,
}: {
  apps: AdminApp[];
  pendingEmails: Set<string>;
  onDone: () => void;
}) {
  const toast = useToast();
  const [result, setResult] = useState<InviteResult | null>(null);

  const form = useForm<InviteFormValues>({
    initialValues: { email: "", apps: Object.fromEntries(apps.map((a) => [a.id, false])) },
    validate: (v) => ({ email: v.email.trim() ? undefined : "Required" }),
    onSubmit: async (values) => {
      const email = values.email.trim();
      const selectedAppIds = Object.entries(values.apps)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      try {
        const res = await pb.send<{ ok: boolean; id: string; link: string; sent: boolean }>(
          "/api/custom/admin/invite",
          { method: "POST", body: { email, apps: selectedAppIds } }
        );
        setResult({ link: res.link, sent: res.sent, email });
      } catch (error) {
        // The invite route's errors are plain top-level messages (no
        // per-field data, unlike a collection validation error), so the
        // ClientResponseError's own `.message` is already the text to show.
        if (error instanceof ClientResponseError) {
          form.setError("email", error.message);
          return;
        }
        throw error;
      }
    },
  });

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy automatically — select the link text and copy it manually.");
    }
  }

  if (result) {
    return (
      <Flexbox direction="column" gap={16}>
        <Text variant="body">
          {result.sent
            ? `Invite email sent to ${result.email}.`
            : `Email sending isn't configured — copy this link and send it to ${result.email} yourself.`}
        </Text>
        <TextInput label="Activation link" value={result.link} onChange={() => {}} readOnly />
        <Button label="Copy link" variant="secondary" onClick={copyLink} />
        <Text variant="caption">
          Anyone with this link can access this account — send it only to {result.email}.
        </Text>
        <Flexbox direction="row" justifyContent="flex-end">
          <Button label="Done" onClick={onDone} />
        </Flexbox>
      </Flexbox>
    );
  }

  const isPendingResend = pendingEmails.has(form.values.email.trim().toLowerCase());

  return (
    <Form form={form}>
      <TextInput {...form.field("email")} label="Email" type="email" required />
      {isPendingResend && (
        <Alert variant="warning">
          This email already has a pending invite — sending a new one invalidates that link.
        </Alert>
      )}
      <Flexbox direction="column" gap={8}>
        <Text variant="label">Grant access to</Text>
        {apps.map((app) => (
          <Checkbox
            key={app.id}
            label={app.name}
            value={form.values.apps[app.id] ?? false}
            onChange={(checked) =>
              form.setValue("apps", { ...form.values.apps, [app.id]: checked })
            }
          />
        ))}
      </Flexbox>
      <SubmitButton label="Generate invite" />
    </Form>
  );
}

function ManageUserModal({
  user,
  apps,
  grantedAppIds,
  isSaving,
  onToggle,
  onDelete,
  onClose,
}: {
  user: AdminUser;
  apps: AdminApp[];
  grantedAppIds: string[];
  isSaving: boolean;
  onToggle: (appId: string, granted: boolean) => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isSelf = user.id === pb.authStore.record?.id;

  return (
    <Flexbox direction="column" gap={20}>
      <TokenSelect
        label="App access"
        isDisabled={isSaving}
        options={apps.map((a) => ({ label: a.name, value: a.id }))}
        value={grantedAppIds}
        onChange={(next) => {
          next.filter((id) => !grantedAppIds.includes(id)).forEach((id) => onToggle(id, true));
          grantedAppIds.filter((id) => !next.includes(id)).forEach((id) => onToggle(id, false));
        }}
      />
      <Flexbox direction="row" justifyContent="space-between" alignItems="center">
        {!isSelf ? (
          <Button
            label="Delete user"
            variant="destructive"
            appearance="outline"
            onClick={() => setConfirmOpen(true)}
          />
        ) : (
          <span />
        )}
        <Button label="Done" variant="secondary" onClick={onClose} />
      </Flexbox>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await onDelete();
          onClose();
        }}
        title="Delete user"
        message={`Delete ${user.name || user.email}? This can't be undone.`}
        confirmLabel="Delete"
      />
    </Flexbox>
  );
}

export function AdminPage() {
  const toast = useToast();
  const [data, setData] = useState<AccessData | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState(0);
  const [manageUserId, setManageUserId] = useState<string | null>(null);

  function refresh() {
    pb.send<AccessData>("/api/custom/admin/access", { method: "GET" }).then((res) => {
      setData(res);
      setGranted(new Set(res.grants.map((g) => grantKey(g.user, g.app))));
    });
  }

  useEffect(refresh, []);

  async function toggle(userId: string, appId: string, next: boolean) {
    const key = grantKey(userId, appId);
    setPending((prev) => new Set(prev).add(key));
    setGranted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    try {
      await pb.send("/api/custom/admin/access", {
        method: "POST",
        body: { user: userId, app: appId, granted: next },
      });
    } catch {
      // Revert on failure — the value already flipped optimistically above.
      setGranted((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(key);
        else copy.add(key);
        return copy;
      });
      toast.error("Couldn't update access. Try again.");
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  }

  async function deleteUser(userId: string) {
    try {
      await pb.send("/api/custom/admin/delete-user", { method: "POST", body: { id: userId } });
      refresh();
    } catch (error) {
      toast.error(error instanceof ClientResponseError ? error.message : "Couldn't delete user.");
      throw error;
    }
  }

  async function resend(user: AdminUser) {
    try {
      const res = await pb.send<{ link: string; sent: boolean }>("/api/custom/admin/invite", {
        method: "POST",
        body: { email: user.email, apps: [] },
      });
      if (res.sent) {
        toast.success(`Invite resent to ${user.email}`);
        return;
      }
      try {
        await navigator.clipboard.writeText(res.link);
        toast.success("Email sending isn't configured — link copied to clipboard.");
      } catch {
        toast.error(
          "Email sending isn't configured, and the link couldn't be copied automatically."
        );
      }
    } catch (error) {
      toast.error(error instanceof ClientResponseError ? error.message : "Couldn't resend invite.");
    }
  }

  if (!data) return <Spinner />;

  const manageUser = data.users.find((u) => u.id === manageUserId) ?? null;

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Flexbox direction="row" justifyContent="space-between" alignItems="center">
          <Header variant="h2">Access</Header>
          <Button
            label="Invite user"
            onClick={() => {
              setInviteKey((k) => k + 1);
              setInviteOpen(true);
            }}
          />
        </Flexbox>
        <Table
          rows={data.users}
          rowKey={(u) => u.id}
          caption="Which users can access which apps"
          columns={[
            {
              header: "User",
              cell: (u) => (
                <Flexbox direction="column" gap={4}>
                  <Flexbox direction="row" alignItems="center" gap={8}>
                    <Text variant="subtitle">{u.name || u.email}</Text>
                    {!u.verified && <Badge variant="warning">Pending</Badge>}
                  </Flexbox>
                  {u.name && <Text variant="caption">{u.email}</Text>}
                </Flexbox>
              ),
            },
            {
              header: "Apps",
              cell: (u: AdminUser) => {
                const userApps = data.apps.filter((a) => granted.has(grantKey(u.id, a.id)));
                if (userApps.length === 0) {
                  return (
                    <Text variant="caption" color="inherit">
                      None
                    </Text>
                  );
                }
                return (
                  <Flexbox direction="row" gap={4} flexWrap="wrap">
                    {userApps.map((a) => (
                      <Badge key={a.id} variant="neutral" emphasis="subtle">
                        {a.name}
                      </Badge>
                    ))}
                  </Flexbox>
                );
              },
            },
            {
              header: "",
              align: "center" as const,
              cell: (u: AdminUser) => (
                <Button
                  label={`Manage ${u.name || u.email}`}
                  appearance="text"
                  density="dense"
                  onClick={() => setManageUserId(u.id)}
                >
                  <Icon name="edit" size={16} label={`Manage ${u.name || u.email}`} />
                </Button>
              ),
            },
            {
              header: "",
              cell: (u: AdminUser) =>
                !u.verified && (
                  <AsyncButton
                    label="Resend"
                    variant="secondary"
                    density="dense"
                    onClick={() => resend(u)}
                  />
                ),
            },
          ]}
        />
      </Flexbox>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user">
        <InviteForm
          key={inviteKey}
          apps={data.apps}
          pendingEmails={
            new Set(data.users.filter((u) => !u.verified).map((u) => u.email.toLowerCase()))
          }
          onDone={() => {
            setInviteOpen(false);
            refresh();
          }}
        />
      </Modal>

      <Modal
        isOpen={manageUser !== null}
        onClose={() => setManageUserId(null)}
        title={manageUser ? `Manage ${manageUser.name || manageUser.email}` : ""}
      >
        {manageUser && (
          <ManageUserModal
            user={manageUser}
            apps={data.apps}
            grantedAppIds={data.apps
              .filter((a) => granted.has(grantKey(manageUser.id, a.id)))
              .map((a) => a.id)}
            isSaving={data.apps.some((a) => pending.has(grantKey(manageUser.id, a.id)))}
            onToggle={(appId, next) => toggle(manageUser.id, appId, next)}
            onDelete={() => deleteUser(manageUser.id)}
            onClose={() => setManageUserId(null)}
          />
        )}
      </Modal>
    </Card>
  );
}
