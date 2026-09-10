export type UsageRow = {
  id: string;
  key: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  created: string;
};

export type UsageTotals = { tokens_in: number; tokens_out: number; calls: number };

export function formatDate(iso: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

// PocketBase datetimes are "YYYY-MM-DD HH:MM:SS.sssZ" -- the date portion is
// already a stable grouping key without parsing a Date.
export function dayKey(created: string): string {
  return created.slice(0, 10);
}

export function dayLabel(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function totalsByKey(rows: UsageRow[]): Record<string, UsageTotals> {
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

/** Groups rows by day, summing tokens in/out per day, sorted ascending. */
export function byDay(rows: UsageRow[]): { key: string; label: string; in: number; out: number }[] {
  const map = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const k = dayKey(r.created);
    const entry = map.get(k) ?? { in: 0, out: 0 };
    entry.in += r.tokens_in;
    entry.out += r.tokens_out;
    map.set(k, entry);
  }
  return [...map.keys()]
    .sort()
    .map((k) => ({ key: k, label: dayLabel(k), ...(map.get(k) as { in: number; out: number }) }));
}

export type TimeRange = "7d" | "30d" | "90d" | "all";

export const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

/** Filters rows to the last N days for a preset range; "all" is a no-op. */
export function filterByRange(rows: UsageRow[], range: TimeRange): UsageRow[] {
  if (range === "all") return rows;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => new Date(r.created.replace(" ", "T")).getTime() >= cutoff);
}
