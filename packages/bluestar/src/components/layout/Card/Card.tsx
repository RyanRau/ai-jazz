import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Spacing } from "../../../theme";

type CardProps = {
  /** The card content. */
  children: React.ReactNode;
  /** Padding in pixels on all sides. Defaults to `16`. */
  padding?: Spacing;
  /** CSS box-shadow value. Pass `"none"` to remove. Defaults to `theme.shadow`. */
  shadow?: string;
};

export default function Card({ children, padding = 16, shadow }: CardProps) {
  const theme = useTheme();

  return (
    <div
      className={css`
        background-color: ${theme.colors.surface};
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius};
        padding: ${padding}px;
        box-shadow: ${shadow ?? theme.shadow};
      `}
    >
      {children}
    </div>
  );
}
