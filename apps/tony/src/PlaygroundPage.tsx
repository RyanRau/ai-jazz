import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AsyncButton,
  Button,
  Card,
  Dropdown,
  FileDropzone,
  Flexbox,
  Header,
  Text,
  TextAreaInput,
  TextInput,
  useTheme,
} from "bluestar";
import type { FileDropzoneValue } from "bluestar";
import { usePlaygroundKey } from "./usePlaygroundKey";
import { GATEWAY_URL } from "./gateway";

type ModelInfo = { id: string; vision: boolean };

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
 * Uses a personal key (see playgroundKey.ts and usePlaygroundKey.ts) rather
 * than asking for one to be pasted in -- usage still attributes to the
 * signed-in user, since it's a real key created via the same self-service
 * route the Keys page uses, just triggered from a prompt here instead of
 * from that page directly.
 */
export function PlaygroundPage() {
  const theme = useTheme();
  const { apiKey, needsKey, keyError, createKey, recoverFromUnauthorized } = usePlaygroundKey();
  // null = not loaded yet, "unavailable" = the gateway couldn't be reached
  // (fall back to a plain text field rather than blocking model entry).
  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<FileDropzoneValue | null>(null);
  const [response, setResponse] = useState<string | null>(null);
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

    const r = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model.trim() || undefined,
        messages: [{ role: "user", content }],
      }),
    });

    if (r.status === 401 && retryOn401) {
      // The cached key was revoked -- known-bad, so recover (or surface why
      // that failed) rather than a confusing auth error for a key the user
      // never typed in themselves.
      const fresh = await recoverFromUnauthorized();
      if (!fresh) return;
      return sendWith(fresh, false);
    }

    const data = await r.json();
    if (!r.ok) {
      throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`);
    }
    setResponse(data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2));
  }

  async function send() {
    if (!apiKey) return;
    setSending(true);
    setError(null);
    setResponse(null);
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
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Playground</Header>
        <Text variant="caption">
          Sends one chat completion directly to {GATEWAY_URL} using your personal key. It's a real
          key like any other and shows up on the Keys page, marked as your default so it can't be
          revoked from under this page.
        </Text>
        {needsKey && (
          <Alert variant="warning" title="No Playground key in this browser">
            <Flexbox direction="column" gap={8} alignItems="flex-start">
              <Text variant="body">
                Create one to start sending prompts -- it's yours alone and only ever shown once
                you've created it.
              </Text>
              <AsyncButton label="Create key" density="dense" onClick={createKey} />
              {keyError && <Text color={theme.colors.error}>{keyError}</Text>}
            </Flexbox>
          </Alert>
        )}
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
        <Flexbox gap={8} alignItems="center">
          <Button
            label={sending ? "Sending…" : "Send"}
            onClick={send}
            isDisabled={sending || !apiKey || !prompt}
          />
          {!sending && elapsedMs !== null && (
            <Text variant="caption">Responded in {formatElapsed(elapsedMs)}</Text>
          )}
        </Flexbox>
        {error && (
          <Alert variant="error" title="Request failed">
            {error}
          </Alert>
        )}
        {response && (
          <Card padding={12}>
            <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
              {response}
            </pre>
          </Card>
        )}
      </Flexbox>
    </Card>
  );
}
