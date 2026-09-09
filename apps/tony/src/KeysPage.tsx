import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  Flexbox,
  Form,
  Header,
  LineChart,
  Modal,
  StatTile,
  SubmitButton,
  Switch,
  Table,
  Text,
  TextInput,
  useColorScheme,
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
  is_default: boolean;
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

// Validated categorical pair (dataviz skill, slots 1/2 -- blue/orange):
// node scripts/validate_palette.js "<pair>" --mode <light|dark> --surface "<bluestar's real surface>"
// passes every check for each mode against its own surface, but the light
// pair fails the lightness-band check against the dark surface, so the two
// modes need their own stepped hexes, not one pair used everywhere.
const COLORS = {
  light: { in: "#2a78d6", out: "#eb6834" },
  dark: { in: "#3987e5", out: "#d95926" },
};

function formatDate(iso: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

function dayKey(created: string): string {
  // PocketBase datetimes are "YYYY-MM-DD HH:MM:SS.sssZ" -- the date portion
  // is already a stable grouping key without parsing a Date.
  return created.slice(0, 10);
}

function dayLabel(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function totalsByKey(rows: UsageRow[]): Record<string, UsageTotals> {
  const totals: Record<string, UsageTotals> = {};
  for (const row of rows) {
    const t = totals[row.key] || { tokens_in: 0, tokens_out: 0, calls: 0 };
    t.tokens_in += row.tokens_in;
    t.tokens_out += row.tokens_out;
    t.calls += 1;
    totals[row.key] = t;
  }
  return totals;
}

/**
 * Key management + usage, in one page since the two are really one subject:
 * which keys exist and what they've been doing. Admin sees every key (with
 * its owner) and every usage row; a regular user sees only their own --
 * enforced by apps/pocketbase/pb_hooks/llm.pb.js, not here. This just
 * renders whatever the hook hands back.
 *
 * The usage section below the table is scoped by the key dropdown: "All
 * keys" reuses the rows already fetched for the table's per-key totals
 * column, but picking one key re-fetches with ?key=<id> instead of
 * filtering client-side -- the unfiltered fetch is capped server-side at
 * 500 rows total, so filtering it after the fact could silently miss older
 * rows for a quiet key once other keys' activity has pushed them out.
 */
export function KeysPage() {
  const record = useAuthRecord();
  const isAdmin = record?.is_admin === true;
  const toast = useToast();
  const { resolved } = useColorScheme();

  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [allUsage, setAllUsage] = useState<UsageRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ label: string; key: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<KeyRow | null>(null);

  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [keyScopedUsage, setKeyScopedUsage] = useState<UsageRow[] | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);

  function load() {
    return Promise.all([
      pb.send<{ keys: KeyRow[] }>("/api/custom/llm/keys", { method: "GET" }),
      pb.send<{ usage: UsageRow[] }>("/api/custom/llm/usage", { method: "GET" }),
    ]).then(([keysRes, usageRes]) => {
      setKeys(keysRes.keys);
      setAllUsage(usageRes.usage);
    });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedKeyId) return;
    let cancelled = false;
    pb.send<{ usage: UsageRow[] }>("/api/custom/llm/usage", {
      method: "GET",
      query: { key: selectedKeyId },
    }).then((res) => {
      if (!cancelled) setKeyScopedUsage(res.usage);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedKeyId]);

  const usageByKey = totalsByKey(allUsage);

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

  // A revoked key is soft-deleted, not gone -- it stays out of the table
  // and usage dropdown by default, but toggling "Show revoked keys" brings
  // it (and its usage) back into view rather than deleting the record.
  function toggleShowRevoked(next: boolean) {
    setShowRevoked(next);
    if (!next && keys?.find((k) => k.id === selectedKeyId)?.revoked_at) {
      setSelectedKeyId("");
    }
  }

  if (keys === null) return null;

  const visibleKeys = showRevoked ? keys : keys.filter((k) => !k.revoked_at);
  const visibleKeyIds = new Set(visibleKeys.map((k) => k.id));

  const keyOptions = [
    { label: "All keys", value: "" },
    ...visibleKeys.map((k) => ({
      label: isAdmin && k.owner_email ? `${k.label} (${k.owner_email})` : k.label,
      value: k.id,
    })),
  ];

  const rows = selectedKeyId
    ? (keyScopedUsage ?? [])
    : allUsage.filter((r) => visibleKeyIds.has(r.key));
  const totalCalls = rows.length;
  const totalIn = rows.reduce((sum, r) => sum + r.tokens_in, 0);
  const totalOut = rows.reduce((sum, r) => sum + r.tokens_out, 0);

  const byDay = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const dKey = dayKey(r.created);
    const entry = byDay.get(dKey) ?? { in: 0, out: 0 };
    entry.in += r.tokens_in;
    entry.out += r.tokens_out;
    byDay.set(dKey, entry);
  }
  const days = [...byDay.keys()].sort();
  const colors = COLORS[resolved];

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Flexbox justifyContent="space-between" alignItems="center">
          <Header variant="h2">API keys</Header>
          <Button label="New key" variant="creation" onClick={() => setCreating(true)} />
        </Flexbox>

        <Switch label="Show revoked keys" value={showRevoked} onChange={toggleShowRevoked} />

        <Table
          rows={visibleKeys}
          rowKey={(k) => k.id}
          empty={
            <EmptyState
              title={showRevoked ? "No keys yet" : "No active keys"}
              description={
                showRevoked
                  ? "Create one to start calling the gateway."
                  : 'Turn on "Show revoked keys" to see revoked ones.'
              }
            />
          }
          columns={[
            {
              header: "Label",
              cell: (k) => (
                <Flexbox direction="column" gap={4}>
                  <Flexbox gap={4} alignItems="center">
                    <Text variant="subtitle">{k.label}</Text>
                    {k.is_default && <Badge variant="neutral">Default</Badge>}
                  </Flexbox>
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
                !k.revoked_at && !k.is_default ? (
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

        <Flexbox direction="column" gap={16} style={{ marginTop: 8 }}>
          <Flexbox justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
            <Header variant="h2">Usage</Header>
            <div style={{ minWidth: 220 }}>
              <Dropdown
                options={keyOptions}
                value={selectedKeyId}
                onChange={(v) => setSelectedKeyId(v ?? "")}
              />
            </div>
          </Flexbox>

          {rows.length === 0 ? (
            <Text variant="body">No usage yet.</Text>
          ) : (
            <>
              <Flexbox gap={16} flexWrap="wrap">
                <StatTile label="Total calls" value={totalCalls.toLocaleString()} />
                <StatTile label="Tokens in" value={formatCompact(totalIn)} />
                <StatTile label="Tokens out" value={formatCompact(totalOut)} />
              </Flexbox>

              <LineChart
                formatValue={formatCompact}
                series={[
                  {
                    key: "in",
                    label: "Tokens in",
                    color: colors.in,
                    points: days.map((d) => ({ x: dayLabel(d), y: byDay.get(d)?.in ?? 0 })),
                  },
                  {
                    key: "out",
                    label: "Tokens out",
                    color: colors.out,
                    points: days.map((d) => ({ x: dayLabel(d), y: byDay.get(d)?.out ?? 0 })),
                  },
                ]}
              />
            </>
          )}
        </Flexbox>
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
