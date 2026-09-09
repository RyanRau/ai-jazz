import { css } from "goober";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export type MenuProps = {
  /** The clickable element that opens the menu — wrapped in a native <button>. */
  trigger: ReactNode;
  /** Accessible label for that button (trigger is often non-text, e.g. an Avatar). */
  triggerLabel?: string;
  /** Panel content. */
  children: ReactNode;
  /** Panel width in px. Defaults to 240. */
  width?: number;
};

/**
 * A single flat dropdown panel, always right-aligned to the trigger's right
 * edge — deliberately narrow scope, since the only real consumer today is a
 * top-right account pill. No nested submenus, no configurable alignment; add
 * an `align` prop later if a second use case needs one.
 *
 * Built on the native Popover API rather than hand-rolled — the same reason
 * `Modal` is built on `<dialog>`: light-dismiss (click-outside-to-close),
 * Esc-to-close, and top-layer stacking come for free instead of being
 * fiddly and easy to get subtly wrong when hand-rolled.
 */
export default function Menu({ trigger, triggerLabel, children, width = 240 }: MenuProps) {
  const theme = useTheme();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // The panel is `position: fixed`, computed once on open — it won't
    // track page scroll on its own, so it would visually detach from the
    // trigger. Closing on scroll is simpler and safer than re-positioning
    // on every scroll event.
    const close = () => panelRef.current?.hidePopover();
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        popoverTargetAction="toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        className={css`
          display: inline-flex;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          border-radius: ${theme.radius.full};
          &:focus-visible {
            outline: 2px solid ${theme.colors.focusRing};
            outline-offset: 2px;
          }
        `}
      >
        {trigger}
      </button>

      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="menu"
        onBeforeToggle={(e) => {
          if (e.newState === "open") {
            // Fires before paint, so the panel is positioned correctly on
            // the very first frame it's visible — no flash at (0, 0).
            const rect = triggerRef.current?.getBoundingClientRect();
            const panel = panelRef.current;
            if (rect && panel) {
              panel.style.top = `${rect.bottom + 8}px`;
              panel.style.left = `${Math.max(8, rect.right - width)}px`;
            }
          }
          setOpen(e.newState === "open");
        }}
        className={css`
          position: fixed;
          width: ${width}px;
          margin: 0;
          padding: 12px;
          border: 1px solid ${theme.colors.border};
          border-radius: ${theme.radius.md};
          background-color: ${theme.colors.surface};
          box-shadow: ${theme.shadow.lg};
        `}
      >
        {children}
      </div>
    </>
  );
}
