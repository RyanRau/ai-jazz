import { useEffect, useState } from "react";
import { GATEWAY_URL } from "./gateway";

export type ModelInfo = {
  id: string;
  vision: boolean;
  /** Startup-CLI-only, fixed per model in the gateway's config.yaml -- not
   *  something a request can override. `null` when the model's `args`
   *  don't set it. */
  contextSize: number | null;
  /** Same startup-only caveat as `contextSize`; distinct from the
   *  per-request `reasoningEffort` a caller can still choose within it. */
  reasoningBudget: number | null;
  /** Freeform markdown for the info modal -- pros/cons/tradeoffs the model's
   *  author wrote in config.yaml. Empty string when there's nothing set. */
  notes: string;
};

type ModelsResponse = {
  data: {
    id: string;
    vision?: boolean;
    context_size?: number | null;
    reasoning_budget?: number | null;
    notes?: string;
  }[];
};

/**
 * Fetches the gateway's model list once an API key is available. Shared by
 * Playground and Chat, which each used to run this same fetch effect
 * independently -- pulled out here so the extended fields (context size,
 * reasoning budget, notes -- see gateway.py's list_models) only need
 * mapping in one place.
 *
 * `null` = not loaded yet, `"unavailable"` = the gateway couldn't be
 * reached (callers fall back to a plain text field / hide model-specific UI
 * rather than blocking on it).
 */
export function useModels(apiKey: string | null): ModelInfo[] | "unavailable" | null {
  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${GATEWAY_URL}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ModelsResponse) =>
        setModels(
          data.data.map((m) => ({
            id: m.id,
            vision: m.vision === true,
            contextSize: m.context_size ?? null,
            reasoningBudget: m.reasoning_budget ?? null,
            notes: m.notes ?? "",
          }))
        )
      )
      .catch(() => setModels("unavailable"));
  }, [apiKey]);

  return models;
}
