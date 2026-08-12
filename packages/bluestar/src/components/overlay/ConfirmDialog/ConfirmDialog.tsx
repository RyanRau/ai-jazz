import Modal from "../Modal/Modal";
import Button from "../../buttons/Button/Button";
import AsyncButton from "../../buttons/AsyncButton/AsyncButton";
import Text from "../../text/Text/Text";
import type { ButtonVariant } from "../../buttons/Button/Button";

export type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** May be async — the confirm button spins until it settles. */
  onConfirm: () => void | Promise<void>;
  title: string;
  /** The question. Be specific about what is about to happen. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Defaults to `"destructive"` — the common case for a confirmation. */
  confirmVariant?: ButtonVariant;
};

/** A yes/no gate in front of an irreversible action. */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={400}
      footer={
        <>
          <Button label={cancelLabel} variant="secondary" onClick={onClose} />
          <AsyncButton
            label={confirmLabel}
            variant={confirmVariant}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          />
        </>
      }
    >
      <Text variant="subtitle">{message}</Text>
    </Modal>
  );
}
