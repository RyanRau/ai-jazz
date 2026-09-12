import { Badge, Flexbox, Header, ListRow, Modal, Text } from "bluestar";
import type { ModelInfo } from "./useChat";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Unknown size";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatContextSize(n: number | null): string {
  if (n === null) return "Unknown";
  return `${new Intl.NumberFormat(undefined, { notation: "compact" }).format(n)} tokens`;
}

// Not a real model -- the gateway's own configured default (config.yaml's
// `default` alias), for the option every existing Dropdown already offered
// as "Gateway default" (an empty `model` field lets the gateway decide).
const GATEWAY_DEFAULT: ModelInfo = {
  id: "",
  vision: false,
  context_size: null,
  size_bytes: null,
  description: "Whatever the gateway's config.yaml marks as its default model.",
  best_for: null,
};

/**
 * Two-column model picker: a selectable list (name + size) on the left,
 * the selected model's full capability profile on the right -- everything
 * GET /v1/models reports (gateway.py), so this is the one place that
 * capability metadata actually gets shown, rather than a bare id in a
 * `Dropdown`. Selecting a row applies it and closes the modal immediately
 * (one click, not select-then-confirm), matching how the `Dropdown`s this
 * replaces already behaved.
 */
export function ModelPickerModal({
  isOpen,
  onClose,
  models,
  value,
  onChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  models: ModelInfo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const options = [GATEWAY_DEFAULT, ...models];
  const selected = options.find((m) => m.id === value) ?? GATEWAY_DEFAULT;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a model" width={640}>
      <Flexbox gap={16} alignItems="flex-start" flexWrap="wrap">
        <Flexbox
          direction="column"
          gap={4}
          style={{ width: 220, flexShrink: 0, maxHeight: 420, overflowY: "auto" }}
        >
          {options.map((m) => (
            <ListRow
              key={m.id || "default"}
              title={m.id || "Gateway default"}
              subtitle={formatBytes(m.size_bytes)}
              badge={m.vision ? <Badge variant="neutral">vision</Badge> : undefined}
              selected={selected.id === m.id}
              onClick={() => {
                onChange(m.id);
                onClose();
              }}
            />
          ))}
        </Flexbox>

        <Flexbox direction="column" gap={12} style={{ flex: 1, minWidth: 240 }}>
          <Header variant="h3">{selected.id || "Gateway default"}</Header>
          {selected.description && <Text variant="body">{selected.description}</Text>}

          {selected.best_for && (
            <Flexbox direction="column" gap={4}>
              <Text variant="label">Best for</Text>
              <Text variant="body">{selected.best_for}</Text>
            </Flexbox>
          )}

          <Flexbox direction="column" gap={4}>
            <Text variant="label">Parameters</Text>
            <Text variant="caption">
              Context window: {formatContextSize(selected.context_size)}
            </Text>
            <Text variant="caption">Size on disk: {formatBytes(selected.size_bytes)}</Text>
          </Flexbox>

          <Flexbox direction="column" gap={4}>
            <Text variant="label">Supports</Text>
            <Flexbox gap={8} flexWrap="wrap">
              <Badge variant={selected.vision ? "success" : "neutral"} emphasis="subtle">
                {selected.vision ? "Image input" : "No image input"}
              </Badge>
            </Flexbox>
          </Flexbox>
        </Flexbox>
      </Flexbox>
    </Modal>
  );
}
