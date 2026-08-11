import React, { useMemo } from "react";
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
  style?: object;
};

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
  const styles = useMemo(() => {
    return {
      flexBox: {
        display: "flex",
        flexDirection: direction,
        flexGrow: grow,
        flexShrink: shrink,
        gap,
        flexWrap,
        justifyContent,
        alignContent,
        alignItems,
        width,
        height,
        ...style,
      },
    };
  }, [
    alignContent,
    alignItems,
    direction,
    flexWrap,
    gap,
    grow,
    height,
    justifyContent,
    shrink,
    style,
    width,
  ]);

  return <div style={styles.flexBox}>{children}</div>;
}
