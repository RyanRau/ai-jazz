import { useEffect, useState } from "react";
import { Alert, Button, Card, Flexbox, Header, Text, TextAreaInput, TextInput } from "bluestar";
import { useAuthRecord } from "./useAuth";
import { getOrCreatePlaygroundKey, mintPlaygroundKey, clearPlaygroundKey } from "./playgroundKey";

// Same convention as pb.ts's VITE_PB_URL: only set for pointing at a gateway
// reachable during local dev. In production this is the gateway's public
// subdomain once the WireGuard tunnel + Traefik route exist (see
// home-server/llm-gateway) -- until then, requests here will fail to reach
// it, which is expected, not a bug in this page.
const GATEWAY_URL = import.meta.env.VITE_LLM_GATEWAY_URL ?? "https://llm.ryanzrau.dev";

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
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!record) return;
    getOrCreatePlaygroundKey(record.id)
      .then(setApiKey)
      .catch(() => setKeyError("Couldn't set up your personal key. Try reloading."));
  }, [record]);

  async function sendWith(key: string, retryOn401: boolean): Promise<void> {
    const r = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model.trim() || undefined,
        messages: [{ role: "user", content: prompt }],
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
          like any other: manage or revoke it on the Keys page.
        </Text>
        <TextInput
          label="Model"
          value={model}
          onChange={setModel}
          placeholder="leave blank for the gateway's default"
        />
        <TextAreaInput
          label="Prompt"
          value={prompt}
          onChange={setPrompt}
          rows={6}
          placeholder="Ask it something"
        />
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
