import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  FileDropzone,
  Flexbox,
  Header,
  Markdown,
  NumberInput,
  Switch,
  Text,
  TextAreaInput,
  TextInput,
} from "bluestar";
import type { FileDropzoneValue } from "bluestar";
import { useGatewayAuth } from "./useGatewayAuth";
import { parseSseLines, deltaContent, eventUsage } from "./sse";
import { GATEWAY_URL } from "./gateway";

type ModelInfo = { id: string; vision: boolean };
type Usage = { tokens_in: number; tokens_out: number };

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Builds the /v1/chat/completions request body from the page's controls.
 * `temperature`/`maxTokens`/`topP` cover the common sampling knobs directly;
 * `advancedParamsText` is a raw-JSON escape hatch for anything else the
 * gateway forwards untouched (llama-server's own `reasoning_budget`, `min_p`,
 * `seed`, ...) without this page needing to hardcode every possible name --
 * see home-server/llm-gateway's README on what actually passes through.
 * Whatever's in there wins over the dedicated fields on a key collision, so
 * it's also how to override the ones above with something more exotic.
 */
function buildBody(params: {
  model: string;
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
  temperature: number | null;
  maxTokens: number | null;
  topP: number | null;
  streamEnabled: boolean;
  advancedParamsText: string;
}): { body: Record<string, unknown> } | { error: string } {
  const body: Record<string, unknown> = {
    model: params.model.trim() || undefined,
    messages: [{ role: "user", content: params.content }],
  };
  if (params.temperature !== null) body.temperature = params.temperature;
  if (params.maxTokens !== null) body.max_tokens = params.maxTokens;
  if (params.topP !== null) body.top_p = params.topP;
  if (params.streamEnabled) {
    body.stream = true;
    // Some llama-server builds only include token counts in a streamed
    // response's usage field when this is set -- see the gateway README's
    // Limitations section.
    body.stream_options = { include_usage: true };
  }

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
    Object.assign(body, extra);
  }

  return { body };
}

/**
 * A one-off prompt tester: pastes straight through to the gateway's own
 * /v1/chat/completions from the browser, the same as any other API client.
 * Deliberately not wired through PocketBase -- once the gateway is publicly
 * reachable there's no reason to proxy a request that isn't going anywhere
 * near PocketBase's own data.
 *
 * Authenticates with your own PocketBase session (see useGatewayAuth.ts)
 * rather than asking for a key to be pasted in -- usage still attributes to
 * you individually, via the same server-managed default key the Keys page
 * shows, just resolved from your login instead of a client-cached secret.
 */
export function PlaygroundPage() {
  const { apiKey, recoverFromUnauthorized } = useGatewayAuth();
  // null = not loaded yet, "unavailable" = the gateway couldn't be reached
  // (fall back to a plain text field rather than blocking model entry).
  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<FileDropzoneValue | null>(null);

  const [temperature, setTemperature] = useState<number | null>(null);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const [topP, setTopP] = useState<number | null>(null);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [advancedParamsText, setAdvancedParamsText] = useState("");

  const [response, setResponse] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${GATEWAY_URL}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { data: { id: string; vision?: boolean }[] }) =>
        setModels(data.data.map((m) => ({ id: m.id, vision: m.vision === true })))
      )
      .catch(() => setModels("unavailable"));
  }, [apiKey]);

  // Stop the tick if the page is left mid-request rather than leaking a
  // dangling interval.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const modelList = models === "unavailable" || models === null ? null : models;
  const selectedModel = modelList?.find((m) => m.id === model);
  // Unknown until a specific model is picked and its capabilities are known
  // (the gateway's own default could be anything) -- only actively block
  // the attach control once we know for sure it won't work.
  const visionUnsupported = selectedModel !== undefined && !selectedModel.vision;

  function onModelChange(value: string | null) {
    const next = value ?? "";
    setModel(next);
    // Switching to a model that can't take images makes a pending
    // attachment stale -- clear it here, at the point it happens, rather
    // than watching the derived flag from an effect.
    if (modelList?.find((m) => m.id === next)?.vision === false) setImage(null);
  }

  function startTimer() {
    startRef.current = performance.now();
    setElapsedMs(0);
    timerRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startRef.current);
    }, 100);
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedMs(performance.now() - startRef.current);
  }

  async function sendWith(key: string, retryOn401: boolean): Promise<void> {
    const content = image
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image.dataUrl } },
        ]
      : prompt;

    const built = buildBody({
      model,
      content,
      temperature,
      maxTokens,
      topP,
      streamEnabled,
      advancedParamsText,
    });
    if ("error" in built) {
      setError(built.error);
      return;
    }

    const r = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(built.body),
    });

    if (r.status === 401 && retryOn401) {
      // The token went stale between renders -- refresh and retry once.
      // null means the underlying session is gone entirely, which already
      // dropped this back to the login screen.
      const fresh = await recoverFromUnauthorized();
      if (!fresh) return;
      return sendWith(fresh, false);
    }

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`);
    }

    if (streamEnabled && r.body) {
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseLines(buffer);
        buffer = parsed.leftover;
        for (const ev of parsed.events) {
          const delta = deltaContent(ev);
          if (delta) {
            accumulated += delta;
            setResponse(accumulated);
          }
          const u = eventUsage(ev);
          if (u) {
            setUsage({ tokens_in: u.prompt_tokens ?? 0, tokens_out: u.completion_tokens ?? 0 });
          }
        }
      }
      return;
    }

    const data = await r.json();
    setResponse(data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2));
    if (data.usage) {
      setUsage({
        tokens_in: data.usage.prompt_tokens ?? 0,
        tokens_out: data.usage.completion_tokens ?? 0,
      });
    }
  }

  async function send() {
    if (!apiKey) return;
    setSending(true);
    setError(null);
    setResponse(null);
    setUsage(null);
    startTimer();
    try {
      await sendWith(apiKey, true);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? `Couldn't reach ${GATEWAY_URL} -- it isn't publicly reachable yet (see home-server/llm-gateway's README on the WireGuard tunnel).`
          : e instanceof Error
            ? e.message
            : "Something went wrong."
      );
    } finally {
      stopTimer();
      setSending(false);
    }
  }

  return (
    <Flexbox direction="column" gap={16}>
      <Flexbox direction="column" gap={4}>
        <Header variant="h2">Playground</Header>
        <Text variant="caption">
          Sends one chat completion directly to {GATEWAY_URL}, authenticated as you. Usage shows up
          on the Keys page under your default key, which can't be revoked from under this page.
        </Text>
      </Flexbox>

      <Flexbox gap={20} flexWrap="wrap" alignItems="flex-start">
        <div style={{ flex: "1 1 380px", minWidth: 320 }}>
          <Card padding={24}>
            <Flexbox direction="column" gap={16}>
              {modelList ? (
                <Dropdown
                  label="Model"
                  options={[
                    { label: "Gateway default", value: "" },
                    ...modelList.map((m) => ({
                      label: m.vision ? `${m.id} (vision)` : m.id,
                      value: m.id,
                    })),
                  ]}
                  value={model}
                  onChange={onModelChange}
                />
              ) : (
                <TextInput
                  label="Model"
                  value={model}
                  onChange={setModel}
                  placeholder="leave blank for the gateway's default"
                />
              )}
              <TextAreaInput
                label="Prompt"
                value={prompt}
                onChange={setPrompt}
                rows={6}
                placeholder="Ask it something"
              />
              <FileDropzone
                label="Image (optional)"
                value={image}
                onChange={setImage}
                accept="image/*"
                isDisabled={visionUnsupported}
                warning={visionUnsupported ? `"${model}" doesn't support image input.` : undefined}
              />

              <Flexbox direction="column" gap={12}>
                <Text variant="label">Parameters</Text>
                <Flexbox gap={12} flexWrap="wrap">
                  <div style={{ width: 130 }}>
                    <NumberInput
                      label="Temperature"
                      value={temperature}
                      onChange={setTemperature}
                      min={0}
                      max={2}
                      step={0.1}
                      placeholder="default"
                    />
                  </div>
                  <div style={{ width: 130 }}>
                    <NumberInput
                      label="Max tokens"
                      value={maxTokens}
                      onChange={setMaxTokens}
                      min={1}
                      placeholder="default"
                    />
                  </div>
                  <div style={{ width: 130 }}>
                    <NumberInput
                      label="Top P"
                      value={topP}
                      onChange={setTopP}
                      min={0}
                      max={1}
                      step={0.05}
                      placeholder="default"
                    />
                  </div>
                </Flexbox>
                <Switch
                  label="Stream response"
                  value={streamEnabled}
                  onChange={setStreamEnabled}
                  description="Read the reply as it's generated instead of waiting for the whole thing."
                />
                <TextAreaInput
                  label="Advanced params (JSON, optional)"
                  value={advancedParamsText}
                  onChange={setAdvancedParamsText}
                  rows={2}
                  placeholder='e.g. {"reasoning_budget": 1024, "min_p": 0.05, "seed": 42}'
                  description="Merged into the request body -- anything your llama-server build accepts passes straight through. Context size is fixed per model in the gateway's config, not something a request can override."
                />
              </Flexbox>

              <Button
                label={sending ? "Sending…" : "Send"}
                onClick={send}
                isDisabled={sending || !apiKey || !prompt}
              />
            </Flexbox>
          </Card>
        </div>

        <div style={{ flex: "2 1 420px", minWidth: 320 }}>
          <Card padding={24}>
            <Flexbox direction="column" gap={16}>
              <Flexbox justifyContent="space-between" alignItems="center">
                <Header variant="h3">Response</Header>
                {!sending && elapsedMs !== null && (
                  <Text variant="caption">
                    {formatElapsed(elapsedMs)}
                    {usage &&
                      ` · ${usage.tokens_in.toLocaleString()} in · ${usage.tokens_out.toLocaleString()} out`}
                  </Text>
                )}
              </Flexbox>
              {error && (
                <Alert variant="error" title="Request failed">
                  {error}
                </Alert>
              )}
              {response ? (
                <Markdown content={response} />
              ) : (
                !error && <Text variant="caption">Send a prompt to see the response here.</Text>
              )}
            </Flexbox>
          </Card>
        </div>
      </Flexbox>
    </Flexbox>
  );
}
