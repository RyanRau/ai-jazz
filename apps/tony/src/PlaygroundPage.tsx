import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Flexbox,
  Header,
  Icon,
  Text,
  TextAreaInput,
  TextInput,
} from "bluestar";
import { useAuthRecord } from "./useAuth";
import { getOrCreatePlaygroundKey, mintPlaygroundKey, clearPlaygroundKey } from "./playgroundKey";

// Same convention as pb.ts's VITE_PB_URL: only set for pointing at a gateway
// reachable during local dev. In production this is the gateway's public
// subdomain once the WireGuard tunnel + Traefik route exist (see
// home-server/llm-gateway) -- until then, requests here will fail to reach
// it, which is expected, not a bug in this page.
const GATEWAY_URL = import.meta.env.VITE_LLM_GATEWAY_URL ?? "https://llm.ryanzrau.dev";

type ModelInfo = { id: string; vision: boolean };
type ImageAttachment = { name: string; dataUrl: string };

/**
 * A one-off prompt tester: pastes straight through to the gateway's own
 * /v1/chat/completions from the browser, the same as any other API client.
 * Deliberately not wired through PocketBase -- once the gateway is publicly
 * reachable there's no reason to proxy a request that isn't going anywhere
 * near PocketBase's own data.
 *
 * Uses a personal key created automatically on first visit (see
 * playgroundKey.ts) rather than asking for one to be pasted in -- usage
 * still attributes to the signed-in user, since it's a real key created via
 * the same self-service route the Keys page uses, just triggered for them
 * instead of by them.
 */
export function PlaygroundPage() {
  const record = useAuthRecord();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  // null = not loaded yet, "unavailable" = the gateway couldn't be reached
  // (fall back to a plain text field rather than blocking model entry).
  const [models, setModels] = useState<ModelInfo[] | "unavailable" | null>(null);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!record) return;
    getOrCreatePlaygroundKey(record.id)
      .then(setApiKey)
      .catch(() => setKeyError("Couldn't set up your personal key. Try reloading."));
  }, [record]);

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
    // than watching the derived flag from an effect. Goes through
    // removeImage() so the native file input's own displayed filename
    // clears too, not just our copy of it in state.
    if (modelList?.find((m) => m.id === next)?.vision === false) removeImage();
  }

  function onFileSelected(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage({ name: file.name, dataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    if (r.status === 401 && retryOn401 && record) {
      // The cached key was revoked (e.g. from the Keys page) or the cache
      // was cleared -- mint a fresh one and retry once rather than
      // surfacing a confusing auth error for a key the user never typed in
      // themselves.
      const fresh = await mintPlaygroundKey(record.id);
      setApiKey(fresh);
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
      setSending(false);
    }
  }

  async function resetKey() {
    if (!record) return;
    clearPlaygroundKey(record.id);
    setKeyError(null);
    setApiKey(null);
    try {
      setApiKey(await mintPlaygroundKey(record.id));
    } catch {
      setKeyError("Couldn't set up your personal key. Try reloading.");
    }
  }

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Playground</Header>
        <Text variant="caption">
          Sends one chat completion directly to {GATEWAY_URL} using your personal key — created
          automatically the first time you visit, so there's nothing to paste in. It's a real key
          like any other and shows up on the Keys page, marked as your default so it can't be
          revoked from under this page.
        </Text>
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
        <Flexbox direction="column" gap={8}>
          <Flexbox gap={4} alignItems="center">
            <Icon name="image" size={16} />
            <Text variant="label">Image (optional)</Text>
          </Flexbox>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={visionUnsupported}
            onChange={(e) => onFileSelected(e.target.files?.[0])}
          />
          {visionUnsupported && (
            <Text variant="caption">&ldquo;{model}&rdquo; doesn&apos;t support image input.</Text>
          )}
          {image && (
            <Flexbox gap={8} alignItems="center">
              <img
                src={image.dataUrl}
                alt={image.name}
                style={{ maxWidth: 80, maxHeight: 80, borderRadius: 4 }}
              />
              <Text variant="caption">{image.name}</Text>
              <Button label="Remove" variant="secondary" density="dense" onClick={removeImage} />
            </Flexbox>
          )}
        </Flexbox>
        <Flexbox gap={8} alignItems="center">
          <Button
            label={sending ? "Sending…" : "Send"}
            onClick={send}
            isDisabled={sending || !apiKey || !prompt}
          />
          <Button label="Reset key" variant="secondary" density="dense" onClick={resetKey} />
        </Flexbox>
        {keyError && (
          <Alert variant="error" title="Couldn't set up your key">
            {keyError}
          </Alert>
        )}
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
