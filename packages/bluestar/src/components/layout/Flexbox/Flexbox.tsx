import { css } from "goober";
import React from "react";
import type { Spacing } from "../../../theme";

type Props = {
  /** The flex children. */
  children: React.ReactNode;
  /** Main axis direction. Defaults to `"row"`. */
  direction?: "row" | "column";
  /** Gap between children in pixels. */
  gap?: Spacing;
  /** CSS `flex-grow` value. */
  grow?: number;
  /** CSS `flex-shrink` value. */
  shrink?: number;
  /** CSS `flex-wrap` value. */
  flexWrap?: "wrap" | "nowrap";
  /** CSS `justify-content` — distributes space along the main axis. */
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  /** CSS `align-content` — distributes space along the cross axis when wrapping. */
  alignContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "space-between"
    | "space-around";
  /** CSS `align-items` — aligns children along the cross axis. */
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  /** Width of the container. */
  width?: number | string;
  /** Height of the container. */
  height?: number | string;
  /** Additional inline styles merged onto the container. */
  style?: React.CSSProperties;
};

const size = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value;

export default function Flexbox({
  children,
  direction = "row",
  grow,
  shrink,
  gap,
  flexWrap,
  justifyContent,
  alignContent,
  alignItems,
  width,
  height,
  style,
}: Props): React.ReactElement {
  // goober rather than inline styles, so Flexbox composes with the rest of the
  // library (and could grow pseudo-selectors or media queries later).
  const className = css`
    display: flex;
    flex-direction: ${direction};
    ${grow !== undefined ? `flex-grow: ${grow};` : ""}
    ${shrink !== undefined ? `flex-shrink: ${shrink};` : ""}
    ${gap !== undefined ? `gap: ${gap}px;` : ""}
    ${flexWrap ? `flex-wrap: ${flexWrap};` : ""}
    ${justifyContent ? `justify-content: ${justifyContent};` : ""}
    ${alignContent ? `align-content: ${alignContent};` : ""}
    ${alignItems ? `align-items: ${alignItems};` : ""}
    ${width !== undefined ? `width: ${size(width)};` : ""}
    ${height !== undefined ? `height: ${size(height)};` : ""}
  `;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
