import { css } from "goober";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";

export type ModalProps = {
  isOpen: boolean;
  /** Called on Esc, backdrop click, or the close button. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons for the footer row, right-aligned. */
  footer?: ReactNode;
  /** Max width of the dialog. Defaults to `480`. */
  width?: number | string;
  /** Allow closing by clicking the backdrop. Defaults to true. */
  closeOnBackdrop?: boolean;
};

/**
 * A dialog built on the native `<dialog>` element.
 *
 * `showModal()` gives focus trapping, the top layer, inertness of the page
 * behind, and Esc-to-close for free — all of which are fiddly and easy to get
 * subtly wrong when hand-rolled on a div.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 480,
  closeOnBackdrop = true,
}: ModalProps) {
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

        &::backdrop {
          background-color: ${theme.colors.overlay};
        }
      `}
    >
      <div
        className={css`
          width: ${typeof width === "number" ? `${width}px` : width};
          max-width: calc(100vw - 32px);
          background-color: ${theme.colors.background};
          color: ${theme.colors.text};
          border: 1px solid ${theme.colors.border};
          border-radius: ${theme.radius.lg};
          box-shadow: ${theme.shadow.lg};
          padding: 20px;
        `}
      >
        <Flexbox direction="column" gap={16}>
          <Flexbox direction="row" justifyContent="space-between" alignItems="center" gap={12}>
            <Header variant="h3">{title}</Header>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={css`
                background: none;
                border: none;
                cursor: pointer;
                font-size: 20px;
                line-height: 1;
                padding: 2px 6px;
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
              ×
            </button>
          </Flexbox>

          <div>{children}</div>

          {footer && (
            <Flexbox direction="row" justifyContent="flex-end" gap={8}>
              {footer}
            </Flexbox>
          )}
        </Flexbox>
      </div>
    </dialog>
  );
}
