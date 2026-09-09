import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type LineChartPoint = { x: string; y: number };
export type LineChartSeries = {
  key: string;
  label: string;
  color: string;
  points: LineChartPoint[];
};

export type LineChartProps = {
  /** All series must share the same x categories, in the same order. */
  series: LineChartSeries[];
  /** Total chart height in px, including the x-axis label band. Defaults to 260. */
  height?: number;
  /** Formats a value for axis ticks and the tooltip. Defaults to toLocaleString. */
  formatValue?: (n: number) => string;
};

const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * A multi-series line chart: 2px lines, an 8px end-marker per series with a
 * surface ring, a legend + direct end-labels (both, per the <= 4 series
 * rule), a crosshair+tooltip that finds the nearest x on hover, and a
 * table-view toggle -- the accessibility twin every chart needs, not an
 * upgrade. No y-axis dual-scale: every series here shares one unit.
 */
export default function LineChart({ series, height = 260, formatValue }: LineChartProps) {
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

  function xAt(i: number) {
    if (pointCount <= 1) return PAD_LEFT + plotWidth / 2;
    return PAD_LEFT + (plotWidth * i) / (pointCount - 1);
  }
  function yAt(v: number) {
    return PAD_TOP + plotHeight - (plotHeight * v) / maxValue;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxValue);
  const xLabels = series[0]?.points.map((p) => p.x) ?? [];
  const xLabelStride = Math.max(1, Math.ceil(xLabels.length / 6));

  // End-of-line direct labels can land on top of each other when two series
  // converge to a similar value -- nudge apart any pair closer than one line
  // height, keeping their relative order.
  const MIN_LABEL_GAP = 14;
  const endLabelY: Record<string, number> = {};
  const withEnd = series
    .map((s) => ({
      key: s.key,
      y: s.points.length > 0 ? yAt(s.points[s.points.length - 1].y) : null,
    }))
    .filter((s): s is { key: string; y: number } => s.y !== null)
    .sort((a, b) => a.y - b.y);
  withEnd.forEach((s, i) => {
    endLabelY[s.key] = i === 0 ? s.y : Math.max(s.y, endLabelY[withEnd[i - 1].key] + MIN_LABEL_GAP);
  });

  function handlePointerMove(e: PointerEvent<SVGRectElement>) {
    if (pointCount === 0 || plotWidth === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / plotWidth;
    const index = Math.round(ratio * (pointCount - 1));
    setHoverIndex(Math.min(pointCount - 1, Math.max(0, index)));
  }

  if (pointCount === 0) {
    return <Text variant="caption">No data yet.</Text>;
  }

  return (
    <Flexbox direction="column" gap={8}>
      <Flexbox justifyContent="space-between" alignItems="center">
        {/* Legend -- the dependable identity channel for >= 2 series. A line
            key, not a filled box: at this density a box is data-weight ink
            doing a label's job. */}
        <Flexbox gap={16}>
          {series.map((s) => (
            <Flexbox key={s.key} gap={4} alignItems="center">
              <span
                aria-hidden
                style={{ display: "inline-block", width: 14, height: 2, background: s.color }}
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
            aria-label="Usage over time"
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
                  x={xAt(i)}
                  y={height - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fill={theme.colors.textMuted}
                >
                  {label}
                </text>
              ) : null
            )}

            {series.map((s) => {
              const d = s.points
                .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.y)}`)
                .join(" ");
              const last = s.points[s.points.length - 1];
              return (
                <g key={s.key}>
                  <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {last && (
                    <>
                      <circle
                        cx={xAt(s.points.length - 1)}
                        cy={yAt(last.y)}
                        r={4}
                        fill={s.color}
                        stroke={theme.colors.surface}
                        strokeWidth={2}
                      />
                      <text
                        x={Math.min(xAt(s.points.length - 1) + 6, width - PAD_RIGHT - 2)}
                        y={endLabelY[s.key] ?? yAt(last.y)}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize={11}
                        fill={theme.colors.textMuted}
                      >
                        {s.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {hoverIndex !== null && (
              <line
                x1={xAt(hoverIndex)}
                x2={xAt(hoverIndex)}
                y1={PAD_TOP}
                y2={height - PAD_BOTTOM}
                stroke={theme.colors.borderStrong}
                strokeWidth={1}
              />
            )}

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
                left: Math.min(xAt(hoverIndex) + 8, width - 160),
              }}
            >
              <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>
                {xLabels[hoverIndex]}
              </div>
              {series.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{ display: "inline-block", width: 10, height: 2, background: s.color }}
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
