import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  FileDropzone,
  Flexbox,
  Header,
  Icon,
  Markdown,
  Switch,
  Text,
  TextAreaInput,
  TextInput,
} from "bluestar";
import type { FileDropzoneValue } from "bluestar";
import { useGatewayAuth } from "./useGatewayAuth";
import { useModels } from "./useModels";
import type { ModelInfo } from "./useModels";
import { applyModelParams, EMPTY_MODEL_PARAMS } from "./modelParams";
import { ModelParamControls } from "./ModelParamControls";
import { ModelInfoModal } from "./ModelInfoModal";
import { parseSseLines, deltaContent, eventUsage } from "./sse";
import { GATEWAY_URL } from "./gateway";

type Usage = { tokens_in: number; tokens_out: number };

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
  const models = useModels(apiKey);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<FileDropzoneValue | null>(null);

  const [params, setParams] = useState(EMPTY_MODEL_PARAMS);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [infoModel, setInfoModel] = useState<ModelInfo | null>(null);

  const [response, setResponse] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

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

    const base: Record<string, unknown> = {
      model: model.trim() || undefined,
      messages: [{ role: "user", content }],
    };
    if (streamEnabled) {
      base.stream = true;
      // Some llama-server builds only include token counts in a streamed
      // response's usage field when this is set -- see the gateway README's
      // Limitations section.
      base.stream_options = { include_usage: true };
    }
    const built = applyModelParams(base, params);
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
              <Flexbox gap={8} alignItems="flex-end">
                <div style={{ flex: 1, minWidth: 0 }}>
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
                </div>
                {selectedModel && (
                  <Button
                    label="Model info"
                    aria-label={`About ${selectedModel.id}`}
                    appearance="text"
                    variant="secondary"
                    onClick={() => setInfoModel(selectedModel)}
                  >
                    <Icon name="info" size={18} />
                  </Button>
                )}
              </Flexbox>
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

              <ModelParamControls params={params} onChange={setParams} />
              <Switch
                label="Stream response"
                value={streamEnabled}
                onChange={setStreamEnabled}
                description="Read the reply as it's generated instead of waiting for the whole thing."
              />

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

      <ModelInfoModal model={infoModel} onClose={() => setInfoModel(null)} />
    </Flexbox>
  );
}
