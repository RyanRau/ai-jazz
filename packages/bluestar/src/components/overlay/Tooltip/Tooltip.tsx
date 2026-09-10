import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export type TooltipProps = {
  /** The label shown on hover/focus. */
  content: string;
  /** The element the tooltip is attached to — needs to be focusable if it isn't already (a plain `<span>` or `<div>` won't be). */
  children: ReactNode;
  /** Side of `children` the tooltip renders on. Defaults to `"top"`. */
  placement?: "top" | "bottom";
};

/**
 * A small inverted-color label that appears on hover or keyboard focus.
 * Not portaled — fine for the common case (a button in normal flow), but it
 * can clip inside an `overflow: hidden` ancestor.
 */
export default function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const theme = useTheme();
  const offsetHidden = placement === "top" ? "translateY(4px)" : "translateY(-4px)";

  return (
    <span
      className={css`
        position: relative;
        display: inline-flex;

        &:hover [data-bs-tooltip],
        &:focus-within [data-bs-tooltip] {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
      `}
    >
      {children}
      <span
        role="tooltip"
        data-bs-tooltip
        className={css`
          position: absolute;
          left: 50%;
          ${placement === "top" ? "bottom: calc(100% + 6px);" : "top: calc(100% + 6px);"}
          transform: translateX(-50%) ${offsetHidden};
          padding: 4px 8px;
          border-radius: ${theme.radius.sm};
          background-color: ${theme.colors.text};
          color: ${theme.colors.background};
          font-family: ${theme.fonts.body};
          font-size: ${theme.textTypes.caption.size};
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition:
            opacity 0.1s ease,
            transform 0.1s ease;
          z-index: 50;
        `}
      >
        {content}
      </span>
    </span>
  );
}
