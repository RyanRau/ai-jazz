import { css } from "goober";
import { useTheme } from "../../../theme";

type DividerProps = {
  /** Orientation of the divider. Defaults to `"horizontal"`. */
  direction?: "horizontal" | "vertical";
  /**
   * How much of the available space the divider fills, as a percentage.
   * Defaults to `100`.
   */
  length?: number;
};

export default function Divider({ direction = "horizontal", length = 100 }: DividerProps) {
  const theme = useTheme();

  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={css`
        flex-shrink: 0;
        background-color: ${theme.colors.border};
        ${isHorizontal ? `width: ${length}%; height: 1px;` : `height: ${length}%; width: 1px;`}
      `}
    />
  );
}
