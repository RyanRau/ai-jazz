import { css } from "goober";
import { useTheme } from "../../../theme";
import type { Spacing } from "../../../theme";

type CardProps = {
  /** The card content. */
  children: React.ReactNode;
  /** Padding in pixels on all sides. Defaults to `16`. */
  padding?: Spacing;
  /**
   * CSS box-shadow value. Defaults to `"none"` — the border is the surface's
   * primary separator, flat-dashboard style. Pass `theme.shadow.sm/md/lg`
   * for a card that should read as genuinely elevated (rare — reserve real
   * shadow for overlays: menus, modals, popovers).
   */
  shadow?: string;
};

export default function Card({ children, padding = 16, shadow = "none" }: CardProps) {
  const theme = useTheme();

  return (
    <div
      className={css`
        background-color: ${theme.colors.surface};
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius.md};
        padding: ${padding}px;
        box-shadow: ${shadow};
      `}
    >
      {children}
    </div>
  );
}
