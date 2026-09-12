import { Card, Flexbox, Header, Markdown } from "bluestar";
import { GATEWAY_URL } from "./gateway";

const CONTENT = `
Tony sits in front of \`home-server/llm-gateway\`, which is itself an
OpenAI-compatible reverse proxy in front of \`llama-server\`. Everything on
this page applies whether you're calling it from the Playground, a script,
or another app -- the gateway doesn't know or care which.

## Getting a key

Every request needs an API key: \`Authorization: Bearer sk-...\`. Create one
on the **Keys** tab, or use the one the Playground and Chat pages set up for
you automatically the first time you use them (shown there as your
*default* key). A key's plaintext is only ever shown once, right after
creation -- if it's lost, revoke it and mint a new one, or use the
Playground/Chat's own recovery flow if it was one of those default keys.

## Sending a request

\`\`\`bash
curl ${GATEWAY_URL}/v1/chat/completions \\
  -H "Authorization: Bearer sk-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "9b",
    "messages": [{"role": "user", "content": "hi"}]
  }'
\`\`\`

\`model\` is optional -- omit it (or pass \`"default"\`) to use whichever
model the gateway is configured to fall back to. \`GET /v1/models\` lists
every configured model and alias, plus which ones accept image input.

## Parameters

The gateway forwards your request body to \`llama-server\` almost
untouched -- it only normalizes \`model\` and, for the persistent Chat
route, injects \`stream: true\`. That means anything your \`llama-server\`
build accepts in an OpenAI-style chat completion request works here too --
there are two distinct kinds, and it matters which one a given knob is:

**Adjustable per request** -- both Playground and Chat expose these as
dedicated controls (see \`ModelParamControls\` if you're reading the
source), on top of whatever the **Advanced params** JSON field lets you
send:

| Param | What it does |
| --- | --- |
| \`temperature\` | Higher = more random, lower = more deterministic. Usually \`0\`-\`2\`. |
| \`top_p\` | Nucleus sampling cutoff, \`0\`-\`1\`. |
| \`top_k\` | Only sample from the \`k\` most likely next tokens. |
| \`min_p\` | Cuts off tokens below this fraction of the top token's probability. |
| \`presence_penalty\` / \`frequency_penalty\` | Discourage repeating tokens that already appeared, \`-2\`-\`2\`. |
| \`max_tokens\` | Caps the length of the reply. |
| \`seed\` | Fixes the sampler's randomness for reproducible output, if your build supports it. |
| \`reasoning_effort\` | Chat-completions only: \`none\`/\`minimal\`/\`low\`/\`medium\`/\`high\`/\`xhigh\`/\`max\` -- a per-request budget *within* the model's fixed \`reasoning_budget\` ceiling below, not a replacement for it. |
| \`stream\` | Server-Sent Events instead of one JSON response -- see below. |
| everything else (\`repeat_penalty\`, \`dry_*\`, \`xtc_*\`, \`mirostat*\`, \`stop\`, \`grammar\`/\`json_schema\`, \`logit_bias\`, ...) | Whatever else your \`llama-server\` build accepts -- reachable through **Advanced params**, not a dedicated control. |

The **Advanced params** field takes raw JSON merged into the request body
last, so it also wins over a dedicated control above on a key collision --
the way to override one of them with something more exotic.

**Fixed at model launch (\`config.yaml\`), not a request parameter.** These
are set in \`args\` on a model entry and only take effect when that model's
\`llama-server\` process starts -- changing one means editing the gateway's
config and restarting it, never something a request body can override.
The model info button (the \`ⓘ\` next to a model picker in Playground or
Chat) shows a given model's values read-only, plus any freeform notes its
\`config.yaml\` entry sets:

| Config field | What it does |
| --- | --- |
| \`ctx-size\` | The model's context window. |
| \`reasoning-budget\` | A ceiling the per-request \`reasoning_effort\` above operates within, not the same knob. |
| \`n-gpu-layers\` / \`batch-size\` / \`cache-type-k\`/\`v\` / rope scaling / \`--parallel\` / \`--flash-attn\` | Everything else startup-only -- see \`home-server/llm-gateway\`'s README. |

## Per-chat saved params

A chat can remember its own parameter overrides, separately from
Playground's (which never persist). Expand **Model params** above a chat's
composer, adjust anything, and hit **Save as default for this chat** to
make those the chat's own fallback for future turns -- until then,
adjusting params for one message doesn't change what the chat falls back
to next time, the same way Playground's own controls don't persist either.
**Reset to defaults** clears a chat's saved params back to plain unset
ones.

## Streaming

Pass \`"stream": true\` (and, for accurate token counts on some
\`llama-server\` builds, \`"stream_options": {"include_usage": true}\`) to get
the reply as Server-Sent Events instead of one JSON blob at the end:

\`\`\`bash
curl ${GATEWAY_URL}/v1/chat/completions \\
  -H "Authorization: Bearer sk-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "9b", "messages": [{"role": "user", "content": "hi"}], "stream": true}'
\`\`\`

Each line is \`data: {...}\` carrying one \`choices[0].delta.content\` chunk,
ending with \`data: [DONE]\`. The Playground's **Stream response** toggle
does exactly this and renders the reply as it arrives.

## Images

A model with \`vision: true\` (see \`GET /v1/models\`) accepts an image
alongside text, OpenAI-style:

\`\`\`json
{
  "model": "9b",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "What's in this image?"},
      {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
    ]
  }]
}
\`\`\`

The Playground's image field handles the base64 encoding for you.

## Markdown and code

Chat and the Playground both render replies as markdown -- headings, lists,
tables, and fenced code blocks (with a copy button) all work, the same as
this page.

\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}!"
\`\`\`

## Limits worth knowing

- One model loaded at a time -- switching models mid-session costs a reload.
- The gateway needs a WireGuard tunnel reachable from wherever you're
  calling it; a network error here usually means that tunnel is down, not a
  bug in the request.
- New keys and revocations take up to a minute to reach the gateway (it
  polls PocketBase, not the other way around).
`;

export function DocsPage() {
  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Docs</Header>
        <Markdown content={CONTENT} />
      </Flexbox>
    </Card>
  );
}
