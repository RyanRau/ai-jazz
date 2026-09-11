export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/**
 * The request-body sampling params exposed as dedicated controls (see
 * ModelParamControls.tsx) -- the ones common enough across llama.cpp server
 * builds to earn a real field, per the gateway README's own request-body
 * parameter list. Everything else (repeat_penalty, dry_*, xtc_*, mirostat*,
 * stop, grammar/json_schema, logit_bias, ...) stays reachable through
 * `advancedParamsText`'s raw-JSON escape hatch instead of growing this list
 * indefinitely.
 */
export type ModelParams = {
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  minP: number | null;
  presencePenalty: number | null;
  frequencyPenalty: number | null;
  seed: number | null;
  /** Chat-only per llama.cpp's server; empty string = leave unset. */
  reasoningEffort: ReasoningEffort | "";
  maxTokens: number | null;
  advancedParamsText: string;
};

export const EMPTY_MODEL_PARAMS: ModelParams = {
  temperature: null,
  topP: null,
  topK: null,
  minP: null,
  presencePenalty: null,
  frequencyPenalty: null,
  seed: null,
  reasoningEffort: "",
  maxTokens: null,
  advancedParamsText: "",
};

/**
 * Merges `params` into a request `body` the same way Playground's own
 * `buildBody` used to inline -- each dedicated field maps to its real
 * llama-server request-body name, then `advancedParamsText` (arbitrary raw
 * JSON) is merged in last, so it wins over the dedicated fields on a key
 * collision -- also how to override one of them with something more exotic.
 * Pure and caller-agnostic: `model`/`messages`/`stream` are the caller's own
 * concern, not this function's.
 */
export function applyModelParams(
  body: Record<string, unknown>,
  params: ModelParams
): { body: Record<string, unknown> } | { error: string } {
  const next = { ...body };
  if (params.temperature !== null) next.temperature = params.temperature;
  if (params.maxTokens !== null) next.max_tokens = params.maxTokens;
  if (params.topP !== null) next.top_p = params.topP;
  if (params.topK !== null) next.top_k = params.topK;
  if (params.minP !== null) next.min_p = params.minP;
  if (params.presencePenalty !== null) next.presence_penalty = params.presencePenalty;
  if (params.frequencyPenalty !== null) next.frequency_penalty = params.frequencyPenalty;
  if (params.seed !== null) next.seed = params.seed;
  if (params.reasoningEffort) next.reasoning_effort = params.reasoningEffort;

  const extraText = params.advancedParamsText.trim();
  if (extraText) {
    let extra: unknown;
    try {
      extra = JSON.parse(extraText);
    } catch {
      return { error: "Advanced params must be valid JSON." };
    }
    if (extra === null || typeof extra !== "object" || Array.isArray(extra)) {
      return { error: 'Advanced params must be a JSON object, e.g. {"seed": 42}.' };
    }
    Object.assign(next, extra);
  }

  return { body: next };
}
