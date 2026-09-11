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
  title: string;
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
      aria-label={title}
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
        margin: 0 0 0 ${side === "left" ? "0" : "auto"};
        height: 100vh;

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
        <Flexbox
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          gap={12}
          style={{
            flexShrink: 0,
            padding: "12px 12px 12px 16px",
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          <Header variant="h3">{title}</Header>
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
