import { Dropdown, Flexbox, NumberInput, Text, TextAreaInput } from "bluestar";
import { REASONING_EFFORTS } from "./modelParams";
import type { ModelParams } from "./modelParams";

/**
 * Every `NumberInput`/`Dropdown` here is wrapped in `flex: "1 1 200px";
 * min-width: 240px` rather than a narrower fixed width -- bluestar's shared
 * `controlClass` floors every form control at a 240px min-width (see its
 * own comment), so a narrower fixed wrapper doesn't make the control
 * narrower, it just makes the control overflow its wrapper and overlap
 * whatever sits next to it. `min-width: 240px` here matches that real
 * floor instead of fighting it, and `flex: 1 1 200px` still lets each
 * control grow to fill a wide row rather than everything cramming to the
 * left.
 */
const fieldWrapStyle = { flex: "1 1 200px", minWidth: 240 };

/**
 * The sampling-param form shared by Playground and Chat's per-chat params
 * panel -- both bind one `ModelParams` value and get the same 8 dedicated
 * controls plus the advanced-JSON escape hatch, so the two don't duplicate
 * this layout.
 */
export function ModelParamControls({
  params,
  onChange,
}: {
  params: ModelParams;
  onChange: (next: ModelParams) => void;
}) {
  function set<K extends keyof ModelParams>(key: K, value: ModelParams[K]) {
    onChange({ ...params, [key]: value });
  }

  return (
    <Flexbox direction="column" gap={12}>
      <Text variant="label">Parameters</Text>
      <Flexbox gap={12} flexWrap="wrap">
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Temperature"
            value={params.temperature}
            onChange={(v) => set("temperature", v)}
            min={0}
            max={2}
            step={0.1}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Max tokens"
            value={params.maxTokens}
            onChange={(v) => set("maxTokens", v)}
            min={1}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Top P"
            value={params.topP}
            onChange={(v) => set("topP", v)}
            min={0}
            max={1}
            step={0.05}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Top K"
            value={params.topK}
            onChange={(v) => set("topK", v)}
            min={0}
            step={1}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Min P"
            value={params.minP}
            onChange={(v) => set("minP", v)}
            min={0}
            max={1}
            step={0.01}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Presence penalty"
            value={params.presencePenalty}
            onChange={(v) => set("presencePenalty", v)}
            min={-2}
            max={2}
            step={0.1}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Frequency penalty"
            value={params.frequencyPenalty}
            onChange={(v) => set("frequencyPenalty", v)}
            min={-2}
            max={2}
            step={0.1}
            placeholder="default"
          />
        </div>
        <div style={fieldWrapStyle}>
          <NumberInput
            label="Seed"
            value={params.seed}
            onChange={(v) => set("seed", v)}
            step={1}
            placeholder="random"
          />
        </div>
        <div style={fieldWrapStyle}>
          <Dropdown
            label="Reasoning effort"
            options={[
              { label: "Gateway default", value: "" },
              ...REASONING_EFFORTS.map((v) => ({ label: v, value: v })),
            ]}
            value={params.reasoningEffort}
            onChange={(v) => set("reasoningEffort", (v ?? "") as ModelParams["reasoningEffort"])}
          />
        </div>
      </Flexbox>
      <TextAreaInput
        label="Advanced params (JSON, optional)"
        value={params.advancedParamsText}
        onChange={(v) => set("advancedParamsText", v)}
        rows={2}
        placeholder='e.g. {"repeat_penalty": 1.1, "dry_multiplier": 0.8}'
        description="Merged into the request body -- anything your llama-server build accepts passes straight through, and wins over the fields above on a key collision. Context size is fixed per model in the gateway's config, not something a request can override."
      />
    </Flexbox>
  );
}
