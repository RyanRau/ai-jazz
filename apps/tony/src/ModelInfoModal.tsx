import { Badge, Flexbox, Markdown, Modal, Text } from "bluestar";
import type { ModelInfo } from "./useModels";

/**
 * The `info`-icon button next to a model `Dropdown` opens this -- `Dropdown`
 * itself can't grow a per-option info affordance (fixed `{label, value}`
 * options, no render prop, no icon slot; confirmed reading its source), so
 * this is a separate small trigger instead of something embedded in it.
 */
export function ModelInfoModal({
  model,
  onClose,
}: {
  /** `null` closes the modal -- also doubles as `isOpen`, so callers don't
   *  need a separate boolean alongside "which model." */
  model: ModelInfo | null;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={model !== null} onClose={onClose} title={model?.id ?? ""} width={480}>
      {model && (
        <Flexbox direction="column" gap={16}>
          <Flexbox gap={8} flexWrap="wrap">
            {model.vision && <Badge variant="neutral">Vision</Badge>}
            {model.contextSize !== null && (
              <Badge variant="neutral">{model.contextSize.toLocaleString()} ctx</Badge>
            )}
            {model.reasoningBudget !== null && (
              <Badge variant="neutral">
                {model.reasoningBudget.toLocaleString()} reasoning budget
              </Badge>
            )}
          </Flexbox>
          {model.notes ? (
            <Markdown content={model.notes} />
          ) : (
            <Text variant="caption">No notes for this model yet.</Text>
          )}
        </Flexbox>
      )}
    </Modal>
  );
}
