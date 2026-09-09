import { useState } from "react";
import { Alert, Button, Card, Flexbox, Header, Text, TextAreaInput, TextInput } from "bluestar";

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
 */
export function PlaygroundPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    setResponse(null);
    try {
      const r = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.trim() || undefined,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${r.status}`);
      }
      setResponse(data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2));
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

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Playground</Header>
        <Text variant="caption">
          Sends one chat completion directly to {GATEWAY_URL} — the same request any API client
          would make. Paste a key from the Keys tab (it's only ever shown once, so use a fresh one
          if you didn't save the last one).
        </Text>
        <TextInput
          label="API key"
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder="sk-..."
        />
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
        <Button
          label={sending ? "Sending…" : "Send"}
          onClick={send}
          isDisabled={sending || !apiKey || !prompt}
        />
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
