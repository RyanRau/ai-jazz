import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Flexbox,
  Form,
  Header,
  Modal,
  SubmitButton,
  Table,
  Text,
  TextInput,
  useForm,
  useToast,
} from "bluestar";
import { pb } from "./pb";
import { useAuthRecord } from "./useAuth";

type KeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  created: string;
  revoked_at: string;
  last_used_at: string;
  owner_email?: string;
};

type UsageRow = {
  id: string;
  key: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  created: string;
};

type UsageTotals = { tokens_in: number; tokens_out: number; calls: number };

function formatDate(iso: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

/**
 * Key management + per-key usage. Admin sees every key (with its owner) and
 * every usage row; a regular user sees only their own -- enforced by
 * apps/pocketbase/pb_hooks/llm.pb.js, not here. This just renders whatever
 * the hook hands back.
 */
export function KeysPage() {
  const record = useAuthRecord();
  const isAdmin = record?.is_admin === true;
  const toast = useToast();

  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [usageByKey, setUsageByKey] = useState<Record<string, UsageTotals>>({});
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ label: string; key: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<KeyRow | null>(null);

  function load() {
    return Promise.all([
      pb.send<{ keys: KeyRow[] }>("/api/custom/llm/keys", { method: "GET" }),
      pb.send<{ usage: UsageRow[] }>("/api/custom/llm/usage", { method: "GET" }),
    ]).then(([keysRes, usageRes]) => {
      setKeys(keysRes.keys);
      const totals: Record<string, UsageTotals> = {};
      for (const row of usageRes.usage) {
        const t = totals[row.key] || { tokens_in: 0, tokens_out: 0, calls: 0 };
        t.tokens_in += row.tokens_in;
        t.tokens_out += row.tokens_out;
        t.calls += 1;
        totals[row.key] = t;
      }
      setUsageByKey(totals);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const form = useForm<{ label: string }>({
    initialValues: { label: "" },
    validate: (v) => (v.label.trim() ? {} : { label: "Required" }),
    onSubmit: async (v) => {
      const res = await pb.send<{ id: string; label: string; key: string }>(
        "/api/custom/llm/keys",
        { method: "POST", body: { label: v.label.trim() } }
      );
      setCreating(false);
      form.reset();
      setNewKey({ label: res.label, key: res.key });
      await load();
    },
  });

  async function revoke(key: KeyRow) {
    await pb.send("/api/custom/llm/keys/revoke", { method: "POST", body: { id: key.id } });
    setRevokeTarget(null);
    toast.success(`Revoked "${key.label}"`);
    await load();
  }

  if (keys === null) return null;

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Flexbox justifyContent="space-between" alignItems="center">
          <Header variant="h2">API keys</Header>
          <Button label="New key" variant="creation" onClick={() => setCreating(true)} />
        </Flexbox>

        <Table
          rows={keys}
          rowKey={(k) => k.id}
          empty={
            <EmptyState
              title="No keys yet"
              description="Create one to start calling the gateway."
            />
          }
          columns={[
            {
              header: "Label",
              cell: (k) => (
                <Flexbox direction="column" gap={4}>
                  <Text variant="subtitle">{k.label}</Text>
                  <Text variant="caption">{k.key_prefix}…</Text>
                </Flexbox>
              ),
            },
            ...(isAdmin ? [{ header: "Owner", cell: (k: KeyRow) => k.owner_email || "—" }] : []),
            {
              header: "Status",
              cell: (k) =>
                k.revoked_at ? (
                  <Badge variant="error">Revoked</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                ),
            },
            {
              header: "Usage",
              cell: (k) => {
                const t = usageByKey[k.id];
                return (
                  <Text variant="caption">
                    {t
                      ? `${t.calls} call${t.calls === 1 ? "" : "s"} · ${t.tokens_in} in / ${t.tokens_out} out`
                      : "No usage yet"}
                  </Text>
                );
              },
            },
            {
              header: "Last used",
              cell: (k) => <Text variant="caption">{formatDate(k.last_used_at)}</Text>,
            },
            {
              header: "",
              align: "right" as const,
              cell: (k) =>
                !k.revoked_at ? (
                  <Button
                    label="Revoke"
                    variant="destructive"
                    density="dense"
                    onClick={() => setRevokeTarget(k)}
                  />
                ) : null,
            },
          ]}
        />
      </Flexbox>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New API key">
        <Form form={form}>
          <TextInput {...form.field("label")} label="Label" placeholder="e.g. my-laptop" required />
          <SubmitButton label="Create" />
        </Form>
      </Modal>

      <Modal
        isOpen={newKey !== null}
        onClose={() => setNewKey(null)}
        title="Key created"
        footer={<Button label="Done — I've saved it" onClick={() => setNewKey(null)} />}
      >
        <Flexbox direction="column" gap={12}>
          <Text variant="body">
            This is the only time &ldquo;{newKey?.label}&rdquo;&apos;s key is shown. Copy it now —
            it can&apos;t be shown again, only revoked and replaced.
          </Text>
          <Card padding={12}>
            <code style={{ wordBreak: "break-all", fontSize: 13 }}>{newKey?.key}</code>
          </Card>
        </Flexbox>
      </Modal>

      <ConfirmDialog
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) return revoke(revokeTarget);
        }}
        title="Revoke key?"
        message={`"${revokeTarget?.label}" will stop working immediately.`}
        confirmLabel="Revoke"
      />
    </Card>
  );
}
