import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type BarChartPoint = { x: string; y: number };
export type BarChartSeries = {
  key: string;
  label: string;
  color: string;
  points: BarChartPoint[];
};

export type BarChartProps = {
  /** All series must share the same x categories, in the same order. */
  series: BarChartSeries[];
  /** Total chart height in px, including the x-axis label band. Defaults to 260. */
  height?: number;
  /** Formats a value for axis ticks and the tooltip. Defaults to toLocaleString. */
  formatValue?: (n: number) => string;
};

const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const BAR_GAP = 2; // between bars within one category's group, per the dataviz skill
const GROUP_INSET = 0.18; // fraction of a category's slot left as breathing room on each side
const BAR_RADIUS = 4;

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** A <rect> with only its top two corners rounded, sitting on a shared baseline. */
function topRoundedRect(x: number, yTop: number, width: number, yBase: number, radius: number) {
  const h = Math.max(0, yBase - yTop);
  const r = Math.min(radius, width / 2, h);
  if (h <= 0) return "";
  if (r <= 0) {
    return `M ${x} ${yBase} L ${x} ${yTop} L ${x + width} ${yTop} L ${x + width} ${yBase} Z`;
  }
  return [
    `M ${x} ${yBase}`,
    `L ${x} ${yTop + r}`,
    `Q ${x} ${yTop} ${x + r} ${yTop}`,
    `L ${x + width - r} ${yTop}`,
    `Q ${x + width} ${yTop} ${x + width} ${yTop + r}`,
    `L ${x + width} ${yBase}`,
    "Z",
  ].join(" ");
}

/**
 * A multi-series grouped bar chart: one slot per x category, one bar per
 * series within it, top-rounded data-ends, a 2px gap between adjacent bars,
 * a legend (identity channel for >= 2 series), a hover highlight + tooltip
 * per category, and a table-view toggle -- same accessibility twin
 * LineChart ships, same props shape, so the two are interchangeable views
 * over the same data.
 */
export default function BarChart({ series, height = 260, formatValue }: BarChartProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const format = formatValue ?? ((n: number) => n.toLocaleString());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pointCount = series[0]?.points.length ?? 0;
  const allValues = series.flatMap((s) => s.points.map((p) => p.y));
  const maxValue = niceMax(Math.max(1, ...allValues));

  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = Math.max(0, height - PAD_TOP - PAD_BOTTOM);
  const slotWidth = pointCount > 0 ? plotWidth / pointCount : 0;
  const groupWidth = slotWidth * (1 - 2 * GROUP_INSET);
  const barWidth =
    series.length > 0
      ? Math.max(1, (groupWidth - BAR_GAP * (series.length - 1)) / series.length)
      : 0;

  function slotStart(i: number) {
    return PAD_LEFT + i * slotWidth;
  }
  function yAt(v: number) {
    return PAD_TOP + plotHeight - (plotHeight * v) / maxValue;
  }
  const baseline = PAD_TOP + plotHeight;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxValue);
  const xLabels = series[0]?.points.map((p) => p.x) ?? [];
  const xLabelStride = Math.max(1, Math.ceil(xLabels.length / 6));

  function handlePointerMove(e: PointerEvent<SVGRectElement>) {
    if (pointCount === 0 || plotWidth === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / plotWidth;
    const index = Math.floor(ratio * pointCount);
    setHoverIndex(Math.min(pointCount - 1, Math.max(0, index)));
  }

  if (pointCount === 0) {
    return <Text variant="caption">No data yet.</Text>;
  }

  return (
    <Flexbox direction="column" gap={8}>
      <Flexbox justifyContent="space-between" alignItems="center">
        <Flexbox gap={16}>
          {series.map((s) => (
            <Flexbox key={s.key} gap={4} alignItems="center">
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: s.color,
                }}
              />
              <Text variant="caption">{s.label}</Text>
            </Flexbox>
          ))}
        </Flexbox>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className={css`
            background: none;
            border: none;
            cursor: pointer;
            color: ${theme.colors.primary};
            font-size: 12px;
            padding: 2px 4px;
            &:focus-visible {
              outline: 2px solid ${theme.colors.focusRing};
              outline-offset: 2px;
            }
          `}
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </Flexbox>

      {showTable ? (
        <div style={{ overflowX: "auto" }}>
          <table
            className={css`
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;

              th,
              td {
                text-align: right;
                padding: 6px 10px;
                font-variant-numeric: tabular-nums;
                border-bottom: 1px solid ${theme.colors.border};
              }
              th:first-child,
              td:first-child {
                text-align: left;
                font-variant-numeric: normal;
              }
            `}
          >
            <thead>
              <tr>
                <th>Date</th>
                {series.map((s) => (
                  <th key={s.key}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xLabels.map((label, i) => (
                <tr key={label}>
                  <td>{label}</td>
                  {series.map((s) => (
                    <td key={s.key}>{format(s.points[i]?.y ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Usage by day"
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={width - PAD_RIGHT}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke={theme.colors.border}
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={yAt(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={theme.colors.textMuted}
                >
                  {format(Math.round(tick))}
                </text>
              </g>
            ))}

            {xLabels.map((label, i) =>
              i % xLabelStride === 0 ? (
                <text
                  key={label}
                  x={slotStart(i) + slotWidth / 2}
                  y={height - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fill={theme.colors.textMuted}
                >
                  {label}
                </text>
              ) : null
            )}

            {hoverIndex !== null && (
              <rect
                x={slotStart(hoverIndex)}
                y={PAD_TOP}
                width={slotWidth}
                height={plotHeight}
                fill={theme.colors.border}
                opacity={0.35}
              />
            )}

            {Array.from({ length: pointCount }, (_, i) => {
              const groupX = slotStart(i) + slotWidth * GROUP_INSET;
              return series.map((s, si) => {
                const v = s.points[i]?.y ?? 0;
                const barX = groupX + si * (barWidth + BAR_GAP);
                return (
                  <path
                    key={`${s.key}-${i}`}
                    d={topRoundedRect(barX, yAt(v), barWidth, baseline, BAR_RADIUS)}
                    fill={s.color}
                  />
                );
              });
            })}

            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hoverIndex !== null && (
            <div
              className={css`
                position: absolute;
                pointer-events: none;
                background: ${theme.colors.background};
                border: 1px solid ${theme.colors.border};
                border-radius: ${theme.radius.sm};
                box-shadow: ${theme.shadow.md};
                padding: 8px 10px;
                font-size: 12px;
                white-space: nowrap;
              `}
              style={{
                top: PAD_TOP,
                left: Math.min(slotStart(hoverIndex) + slotWidth + 8, width - 160),
              }}
            >
              <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>
                {xLabels[hoverIndex]}
              </div>
              {series.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: s.color,
                    }}
                  />
                  <span style={{ color: theme.colors.textMuted }}>{s.label}</span>
                  <strong style={{ marginLeft: "auto", color: theme.colors.text }}>
                    {format(s.points[hoverIndex]?.y ?? 0)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Flexbox>
  );
}
