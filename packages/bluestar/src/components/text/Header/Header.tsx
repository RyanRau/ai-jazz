import { css } from "goober";
import { useTheme } from "../../../theme";

export type HeaderVariant = "hero" | "h1" | "h2" | "h3";

type HeaderProps = {
  /** The heading content. */
  children: React.ReactNode;
  /**
   * The HTML heading level to render. Controls both the semantic element
   * and the font size / weight. `"hero"` is bigger than `"h1"` for a
   * one-per-page hero/landing headline — not a real heading level, so it
   * still renders as an `<h1>` tag.
   */
  variant?: HeaderVariant;
};

export default function Header({ children, variant = "h1" }: HeaderProps) {
  const theme = useTheme();
  const Tag = variant === "hero" ? "h1" : variant;
  const { size, weight } = theme.headings[variant];

  return (
    <Tag
      className={css`
        font-family: ${theme.fonts.heading};
        font-size: ${size};
        font-weight: ${weight};
        color: ${theme.colors.text};
        margin: 0;
        line-height: 1.2;
      `}
    >
      {children}
    </Tag>
  );
}
