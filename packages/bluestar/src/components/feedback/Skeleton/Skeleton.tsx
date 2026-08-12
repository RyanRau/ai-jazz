import { css, keyframes } from "goober";
import { useTheme } from "../../../theme";

const pulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.45; }
  100% { opacity: 1; }
`;

export type SkeletonProps = {
  /** CSS width. Numbers are pixels. Defaults to `"100%"`. */
  width?: number | string;
  /** CSS height. Numbers are pixels. Defaults to `16`. */
  height?: number | string;
  /** Render as a circle — for avatar placeholders. */
  circle?: boolean;
  /** Stack this many bars with a gap. Defaults to `1`. */
  lines?: number;
};

const size = (value: number | string) => (typeof value === "number" ? `${value}px` : value);

/** Placeholder block shown while content loads. */
export default function Skeleton({
  width = "100%",
  height = 16,
  circle = false,
  lines = 1,
}: SkeletonProps) {
  const theme = useTheme();

  const bar = (key: number, barWidth: number | string) => (
    <span
      key={key}
      aria-hidden="true"
      className={css`
        display: block;
        width: ${size(barWidth)};
        height: ${size(circle ? width : height)};
        border-radius: ${circle ? theme.radius.full : theme.radius.sm};
        background-color: ${theme.colors.surfaceHover};
        animation: ${pulse} 1.4s ease-in-out infinite;
      `}
    />
  );

  if (lines <= 1) {
    return (
      <span role="status" aria-busy="true" aria-label="Loading">
        {bar(0, width)}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={css`
        display: flex;
        flex-direction: column;
        gap: 8px;
      `}
    >
      {/* The last line is shortened so a block of them reads as text. */}
      {Array.from({ length: lines }, (_, i) => bar(i, i === lines - 1 ? "60%" : width))}
    </span>
  );
}
