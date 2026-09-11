import { css } from "goober";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";
import Icon from "../../display/Icon/Icon";

export type DrawerProps = {
  isOpen: boolean;
  /** Called on Esc, backdrop click, or the close button. */
  onClose: () => void;
  /**
   * Heading shown in the drawer's header bar. Omit for a bare bar (just the
   * close button, right-aligned) — the same chrome-less look `AppShell`'s
   * own mobile nav drawer uses, appropriate when `children` already reads
   * as its own section (e.g. a `SideNav` whose own `top` slot is the
   * heading) and a second, redundant title would just add noise. The
   * dialog keeps an accessible label either way, via `ariaLabel`.
   */
  title?: string;
  /** Accessible label for the dialog when there's no visible `title` (falls back to `title`, then `"Navigation"`). */
  ariaLabel?: string;
  /**
   * Set `false` to drop the header bar entirely — no title, no close
   * button — when `children` is itself a complete, self-contained UI with
   * its own way to dismiss or navigate away (e.g. a `SideNav` whose own
   * items double as the way out). The dialog still closes on Esc or a
   * backdrop click either way; only the explicit in-panel close affordance
   * goes away, so make sure at least one of those two still reaches the
   * viewer. Defaults to `true`.
   */
  header?: boolean;
  children: ReactNode;
  /** Which viewport edge the panel is flush against. Defaults to `"left"`. */
  side?: "left" | "right";
  /** Panel width. Defaults to `320`. */
  width?: number | string;
  /** Allow closing by clicking the backdrop. Defaults to true. */
  closeOnBackdrop?: boolean;
};

/**
 * A full-height panel flush against a viewport edge, for a secondary list
 * (chat history, a filter rail) that should float above the page on a
 * narrow viewport rather than compete with it for permanent width — the
 * same job `AppShell`'s own mobile nav drawer does for top-level
 * navigation, generalized for any list-over-content pattern inside a page.
 *
 * Built on the native `<dialog>` element via `showModal()`, the same
 * technique `Modal` uses: focus trapping, the top layer, page inertness,
 * and Esc-to-close all come from the browser rather than being hand-rolled.
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  ariaLabel,
  header = true,
  children,
  side = "left",
  width = 320,
  closeOnBackdrop = true,
}: DrawerProps) {
  const theme = useTheme();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Fires for Esc as well as close(); routing both through onClose keeps the
    // caller's state in step with the element's real open/closed state.
    const handleClose = () => onClose();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={ariaLabel ?? title ?? "Navigation"}
      onClick={(event) => {
        // The dialog element covers the whole viewport, so a click landing on
        // it rather than on the panel inside means the backdrop was clicked.
        if (closeOnBackdrop && event.target === ref.current) onClose();
      }}
      className={css`
        padding: 0;
        border: none;
        background: transparent;
        max-width: 100vw;
        max-height: 100vh;
        max-height: 100dvh;
        margin: 0 0 0 ${side === "left" ? "0" : "auto"};
        /* \`dvh\` tracks the visible viewport, so this doesn't jump when a
           mobile on-screen keyboard opens and shrinks it -- \`vh\` alone
           stays put and the panel would sit partly behind the keyboard. */
        height: 100vh;
        height: 100dvh;

        &::backdrop {
          background-color: ${theme.colors.overlay};
        }
      `}
    >
      <div
        className={css`
          width: ${typeof width === "number" ? `${width}px` : width};
          max-width: calc(100vw - 32px);
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: ${theme.colors.background};
          color: ${theme.colors.text};
          border-${side === "left" ? "right" : "left"}: 1px solid ${theme.colors.border};
          box-shadow: ${theme.shadow.lg};
        `}
      >
        {header && (
          <Flexbox
            direction="row"
            justifyContent={title ? "space-between" : "flex-end"}
            alignItems="center"
            gap={12}
            style={{
              flexShrink: 0,
              padding: "12px 12px 12px 16px",
              borderBottom: `1px solid ${theme.colors.border}`,
            }}
          >
            {title && <Header variant="h3">{title}</Header>}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={css`
                background: none;
                border: none;
                cursor: pointer;
                display: flex;
                /* ~40px tap target, not just the glyph. */
                padding: 10px 12px;
                margin: -10px -12px;
                border-radius: ${theme.radius.sm};
                color: ${theme.colors.textMuted};
                &:hover {
                  color: ${theme.colors.text};
                  background-color: ${theme.colors.surfaceHover};
                }
                &:focus-visible {
                  outline: 2px solid ${theme.colors.focusRing};
                  outline-offset: 2px;
                }
              `}
            >
              <Icon name="close" size={20} />
            </button>
          </Flexbox>
        )}

        <div
          className={css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          `}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
