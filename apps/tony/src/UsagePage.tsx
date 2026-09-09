import { useEffect, useState } from "react";
import { Card, Flexbox, Header, LineChart, StatTile, Text, useColorScheme } from "bluestar";
import { pb } from "./pb";

type UsageRow = {
  id: string;
  key: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  created: string;
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

/**
 * Aggregate usage -- total calls/tokens and a daily time series. Reads the
 * same GET /api/custom/llm/usage route the Keys page's per-key totals do
 * (already scoped there: an admin sees every row, anyone else only their
 * own), just aggregated across all of it instead of grouped by key.
 */
export function UsagePage() {
  const { resolved } = useColorScheme();
  const [rows, setRows] = useState<UsageRow[] | null>(null);

  useEffect(() => {
    pb.send<{ usage: UsageRow[] }>("/api/custom/llm/usage", { method: "GET" }).then((res) =>
      setRows(res.usage)
    );
  }, []);

  if (rows === null) return null;

  const totalCalls = rows.length;
  const totalIn = rows.reduce((sum, r) => sum + r.tokens_in, 0);
  const totalOut = rows.reduce((sum, r) => sum + r.tokens_out, 0);

  const byDay = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const key = dayKey(r.created);
    const entry = byDay.get(key) ?? { in: 0, out: 0 };
    entry.in += r.tokens_in;
    entry.out += r.tokens_out;
    byDay.set(key, entry);
  }
  const days = [...byDay.keys()].sort();
  const colors = COLORS[resolved];

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={24}>
        <Header variant="h2">Usage</Header>

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
    </Card>
  );
}
