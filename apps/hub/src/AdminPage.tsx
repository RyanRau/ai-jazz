import { useEffect, useState } from "react";
import { ClientResponseError } from "pocketbase";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Flexbox,
  Form,
  Header,
  Modal,
  Spinner,
  SubmitButton,
  Table,
  Text,
  TextInput,
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

function InviteForm({ apps, onDone }: { apps: AdminApp[]; onDone: () => void }) {
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

  return (
    <Form form={form}>
      <TextInput {...form.field("email")} label="Email" type="email" required />
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

export function AdminPage() {
  const toast = useToast();
  const [data, setData] = useState<AccessData | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState(0);

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
      // Revert on failure — the checkbox already flipped optimistically above.
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

  if (!data) return <Spinner />;

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
            ...data.apps.map((app) => ({
              header: app.name,
              align: "center" as const,
              cell: (u: AdminUser) => {
                const key = grantKey(u.id, app.id);
                return (
                  <Checkbox
                    label={`${app.name} access for ${u.name || u.email}`}
                    hideLabel
                    value={granted.has(key)}
                    isDisabled={pending.has(key)}
                    onChange={(value) => toggle(u.id, app.id, value)}
                  />
                );
              },
            })),
          ]}
        />
      </Flexbox>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user">
        <InviteForm
          key={inviteKey}
          apps={data.apps}
          onDone={() => {
            setInviteOpen(false);
            refresh();
          }}
        />
      </Modal>
    </Card>
  );
}
