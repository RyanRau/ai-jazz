import { useEffect, useState } from "react";
import { css } from "goober";
import {
  BarChart,
  Badge,
  breakpoints,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Drawer,
  EmptyState,
  Flexbox,
  Form,
  Header,
  LineChart,
  ListRow,
  Modal,
  SegmentedControl,
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
import {
  type UsageRow,
  TIME_RANGE_OPTIONS,
  type TimeRange,
  byDay,
  filterByRange,
  formatCompact,
  formatDate,
} from "./usageHelpers";

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

// Validated categorical pair (dataviz skill, slots 1/2 -- blue/orange):
// node scripts/validate_palette.js "<pair>" --mode <light|dark> --surface "<bluestar's real surface>"
// passes every check for each mode against its own surface, but the light
// pair fails the lightness-band check against the dark surface, so the two
// modes need their own stepped hexes, not one pair used everywhere.
const COLORS = {
  light: { in: "#2a78d6", out: "#eb6834" },
  dark: { in: "#3987e5", out: "#d95926" },
};

/** Shared totals/chart/logs view -- rendered for "All keys" and for one key alike. */
function UsageSection({ rows }: { rows: UsageRow[] }) {
  const { resolved } = useColorScheme();
  const [tab, setTab] = useState<"chart" | "logs">("chart");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [range, setRange] = useState<TimeRange>("30d");

  const scoped = filterByRange(rows, range);
  const totalCalls = scoped.length;
  const totalIn = scoped.reduce((sum, r) => sum + r.tokens_in, 0);
  const totalOut = scoped.reduce((sum, r) => sum + r.tokens_out, 0);
  const days = byDay(scoped);
  const colors = COLORS[resolved];

  if (rows.length === 0) {
    return <Text variant="body">No usage yet.</Text>;
  }

  const series = [
    {
      key: "in",
      label: "Tokens in",
      color: colors.in,
      points: days.map((d) => ({ x: d.label, y: d.in })),
    },
    {
      key: "out",
      label: "Tokens out",
      color: colors.out,
      points: days.map((d) => ({ x: d.label, y: d.out })),
    },
  ];

  return (
    <Flexbox direction="column" gap={16}>
      <Flexbox justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
        <SegmentedControl
          options={[
            { label: "Chart", value: "chart" },
            { label: "Logs", value: "logs" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "chart" && (
          <Flexbox gap={12} flexWrap="wrap">
            <SegmentedControl
              options={[
                { label: "Line", value: "line" },
                { label: "Bar", value: "bar" },
              ]}
              value={chartType}
              onChange={setChartType}
            />
            <SegmentedControl options={TIME_RANGE_OPTIONS} value={range} onChange={setRange} />
          </Flexbox>
        )}
      </Flexbox>

      <Flexbox gap={16} flexWrap="wrap">
        <StatTile label="Total calls" value={totalCalls.toLocaleString()} />
        <StatTile label="Tokens in" value={formatCompact(totalIn)} />
        <StatTile label="Tokens out" value={formatCompact(totalOut)} />
      </Flexbox>

      {tab === "chart" ? (
        scoped.length === 0 ? (
          <Text variant="caption">No usage in this range.</Text>
        ) : chartType === "line" ? (
          <LineChart formatValue={formatCompact} series={series} />
        ) : (
          <BarChart formatValue={formatCompact} series={series} />
        )
      ) : (
        <Table
          rows={scoped}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No calls in this range" description="" />}
          columns={[
            { header: "When", cell: (r) => <Text variant="caption">{formatDate(r.created)}</Text> },
            { header: "Model", cell: (r) => <Text variant="caption">{r.model}</Text> },
            {
              header: "Tokens in",
              align: "right" as const,
              cell: (r) => <Text variant="caption">{r.tokens_in.toLocaleString()}</Text>,
            },
            {
              header: "Tokens out",
              align: "right" as const,
              cell: (r) => <Text variant="caption">{r.tokens_out.toLocaleString()}</Text>,
            },
          ]}
        />
      )}
    </Flexbox>
  );
}

function RenameKeyForm({
  target,
  onDone,
}: {
  target: KeyRow;
  onDone: (newLabel: string) => Promise<void>;
}) {
  const form = useForm<{ label: string }>({
    initialValues: { label: target.label },
    validate: (v) => (v.label.trim() ? {} : { label: "Required" }),
    onSubmit: async (v) => onDone(v.label.trim()),
  });
  return (
    <Form form={form}>
      <TextInput {...form.field("label")} label="Label" required />
      <SubmitButton label="Save" />
    </Form>
  );
}

/**
 * Key management + usage, two panels: a key list on the left (with "All
 * keys" as its own row, aggregating everyone visible), the selected key's
 * detail -- rename/revoke plus its usage -- on the right. Admin sees every
 * key (with its owner) and every usage row; a regular user sees only their
 * own -- enforced by apps/pocketbase/pb_hooks/llm.pb.js, not here.
 */
export function KeysPage() {
  const record = useAuthRecord();
  const isAdmin = record?.is_admin === true;
  const toast = useToast();

  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [allUsage, setAllUsage] = useState<UsageRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ label: string; key: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<KeyRow | null>(null);
  const [renameTarget, setRenameTarget] = useState<KeyRow | null>(null);

  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [keyScopedUsage, setKeyScopedUsage] = useState<UsageRow[] | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [listOpen, setListOpen] = useState(false);

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

  async function rename(key: KeyRow, label: string) {
    await pb.send("/api/custom/llm/keys/rename", { method: "POST", body: { id: key.id, label } });
    setRenameTarget(null);
    toast.success(`Renamed to "${label}"`);
    await load();
  }

  // A revoked key is soft-deleted, not gone -- it stays out of the list by
  // default, but toggling "Show revoked keys" brings it back into view
  // rather than deleting the record.
  function toggleShowRevoked(next: boolean) {
    setShowRevoked(next);
    if (!next && keys?.find((k) => k.id === selectedKeyId)?.revoked_at) {
      setSelectedKeyId("");
    }
  }

  if (keys === null) return null;

  const visibleKeys = showRevoked ? keys : keys.filter((k) => !k.revoked_at);
  const visibleKeyIds = new Set(visibleKeys.map((k) => k.id));
  const selectedKey = visibleKeys.find((k) => k.id === selectedKeyId) ?? null;

  const rows = selectedKeyId
    ? (keyScopedUsage ?? [])
    : allUsage.filter((r) => visibleKeyIds.has(r.key));

  const keyList = (onNavigate: () => void) => (
    <Flexbox direction="column" gap={12}>
      <Switch label="Show revoked" value={showRevoked} onChange={toggleShowRevoked} />

      <Flexbox direction="column" gap={4}>
        <ListRow
          title="All keys"
          selected={selectedKeyId === ""}
          onClick={() => {
            setSelectedKeyId("");
            onNavigate();
          }}
        />
        {visibleKeys.map((k) => (
          <ListRow
            key={k.id}
            title={k.label}
            subtitle={isAdmin ? k.owner_email : undefined}
            badge={k.is_default ? <Badge variant="neutral">Default</Badge> : undefined}
            muted={Boolean(k.revoked_at)}
            selected={selectedKeyId === k.id}
            onClick={() => {
              setSelectedKeyId(k.id);
              onNavigate();
            }}
          />
        ))}
      </Flexbox>
    </Flexbox>
  );

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Flexbox justifyContent="space-between" alignItems="center" gap={12}>
          <Header variant="h2">Keys</Header>
          <Flexbox gap={8} alignItems="center">
            <div
              className={css`
                display: none;
                @media (max-width: ${breakpoints.md}px) {
                  display: flex;
                }
              `}
            >
              <Button
                label={selectedKey ? selectedKey.label : "All keys"}
                variant="secondary"
                appearance="outline"
                density="dense"
                onClick={() => setListOpen(true)}
              />
            </div>
            <Button
              label="New"
              variant="creation"
              density="dense"
              onClick={() => setCreating(true)}
            />
          </Flexbox>
        </Flexbox>

        <Flexbox gap={20} alignItems="flex-start">
          <div
            className={css`
              width: 260px;
              flex-shrink: 0;
              @media (max-width: ${breakpoints.md}px) {
                display: none;
              }
            `}
          >
            {keyList(() => {})}
          </div>

          <div
            className={css`
              flex-shrink: 0;
              align-self: stretch;
              @media (max-width: ${breakpoints.md}px) {
                display: none;
              }
            `}
          >
            <Divider direction="vertical" />
          </div>

          <Flexbox direction="column" gap={16} grow={1} style={{ minWidth: 0 }}>
            {selectedKey ? (
              <>
                <Flexbox
                  justifyContent="space-between"
                  alignItems="flex-start"
                  flexWrap="wrap"
                  gap={12}
                >
                  <Flexbox direction="column" gap={4}>
                    <Flexbox gap={8} alignItems="center">
                      <Header variant="h2">{selectedKey.label}</Header>
                      {selectedKey.is_default && <Badge variant="neutral">Default</Badge>}
                      {selectedKey.revoked_at ? (
                        <Badge variant="error">Revoked</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </Flexbox>
                    <Text variant="caption">
                      {selectedKey.key_prefix}…
                      {isAdmin && selectedKey.owner_email ? ` · ${selectedKey.owner_email}` : ""}
                    </Text>
                    <Text variant="caption">
                      Created {formatDate(selectedKey.created)} · Last used{" "}
                      {formatDate(selectedKey.last_used_at)}
                    </Text>
                  </Flexbox>
                  <Flexbox gap={8}>
                    <Button
                      label="Rename"
                      variant="secondary"
                      density="dense"
                      onClick={() => setRenameTarget(selectedKey)}
                    />
                    {!selectedKey.revoked_at && !selectedKey.is_default && (
                      <Button
                        label="Revoke"
                        variant="destructive"
                        density="dense"
                        onClick={() => setRevokeTarget(selectedKey)}
                      />
                    )}
                  </Flexbox>
                </Flexbox>
                <Divider />
                <UsageSection rows={rows} />
              </>
            ) : (
              <>
                <Header variant="h2">All keys</Header>
                <UsageSection rows={rows} />
              </>
            )}
          </Flexbox>
        </Flexbox>
      </Flexbox>

      <Drawer isOpen={listOpen} onClose={() => setListOpen(false)} title="Keys">
        {keyList(() => setListOpen(false))}
      </Drawer>

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
          <TextInput label="API key" value={newKey?.key ?? ""} onChange={() => {}} readOnly />
        </Flexbox>
      </Modal>

      <Modal
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename key"
      >
        {renameTarget && (
          <RenameKeyForm
            key={renameTarget.id}
            target={renameTarget}
            onDone={(label) => rename(renameTarget, label)}
          />
        )}
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
