import { css } from "goober";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useTheme } from "../../../theme";

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  /** `"muted"` inherits the surrounding text colour until hover. */
  variant?: "primary" | "muted";
  /**
   * Open in a new tab. Adds `rel="noopener noreferrer"`, without which the
   * opened page can reach back through `window.opener`.
   */
  external?: boolean;
};

/**
 * A themed anchor. Router-agnostic on purpose — pass `href`, or hand the whole
 * thing to a router's link via `as`-style composition in the app.
 */
export default function Link({
  children,
  variant = "primary",
  external = false,
  ...props
}: LinkProps) {
  const theme = useTheme();

  return (
    <a
      {...props}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={css`
        color: ${variant === "primary" ? theme.colors.primary : "inherit"};
        font-family: ${theme.fonts.body};
        text-decoration: ${variant === "primary" ? "none" : "underline"};
        text-underline-offset: 2px;
        cursor: pointer;
        border-radius: ${theme.radius.sm};

        &:hover {
          color: ${theme.colors.primaryHover};
          text-decoration: underline;
        }

        &:focus-visible {
          outline: 2px solid ${theme.colors.focusRing};
          outline-offset: 2px;
        }
      `}
    >
      {children}
    </a>
  );
}
