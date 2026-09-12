# LLM Gateway

Reverse-proxy in front of `llama-server`. Adds auth, on-demand model swap, and a
concurrency cap. OpenAI-compatible API.

```
                     ┌──────────────────────────────┐
 client ────────────▶│  gateway.py :8000             │◀── pulls active key
                     │  - API key check             │    hashes, pushes usage
                     │  - concurrency gate (N)      │    (model + tokens only)
                     │  - swap llama-server if      │         │
                     │    "model" field changed     │         ▼
                     └──────────────┬────────────────┘   PocketBase
                                    │ spawns / proxies    (api.ryanzrau.dev)
                     ┌──────────────▼────────────────┐
                     │  llama-server :8100            │
                     │  (one model loaded at a time)  │
                     └─────────────────────────────────┘
```

Model config lives in `config.yaml` — no separate model registry file.

## Install

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp config.example.yaml config.yaml
```

## Configure

`config.yaml` → `models:` — one entry per model. `args` maps to `llama-server --flag value`.

```yaml
- name: "qwen3.5-9b"
  aliases: ["9b", "default"]
  model_path: "~/models/qwen3.5-9b/Qwen3.5-9B-Q4_K_M.gguf"
  mmproj_path: "~/models/qwen3.5-9b/mmproj-BF16.gguf"
  vision: true
  args:
    ctx-size: 16384
    n-gpu-layers: 99
    jinja: true
```

Set `llama_server.binary` to your `llama-server` path (`which llama-server`).

## Auth

API keys and usage (model + token counts only, never request/response content)
live in PocketBase (`apps/pocketbase`), not in `config.yaml` — see
`apps/pocketbase/pb_hooks/llm.pb.js` for the routes and
`apps/pocketbase/pb_migrations/1788918240_llm_api_keys_and_usage.js` for the
schema. This is plain outbound HTTPS to `api.ryanzrau.dev`, the same as any
other app talking to PocketBase — it doesn't need the WireGuard tunnel.

The gateway never sees a plaintext key at rest: it pulls the active set of
SHA-256 hashes on a timer (`key_refresh_seconds`), hashes each incoming
`Authorization: Bearer` token the same way, and compares hashes. **Deny by
default** — a key only works if it was present in the last successful pull,
so a PocketBase outage can delay a new key or revocation taking effect, but
can never turn into open access.

A token that doesn't match any known key hash is tried a second way: as a
live PocketBase user session token, resolved by forwarding it to
PocketBase's `POST /api/custom/llm/keys/default` (which authenticates it as
that user's own session, not the gateway's), cached briefly
(`session_cache_seconds`). This is what Tony's own Chat/Playground pages
send — the signed-in user's regular PocketBase login, not a minted key —
so they work from any browser/device the moment you're signed in there,
with nothing to create or lose track of; usage still attributes to a real
`llm_api_keys` row (the user's auto-provisioned default), same as any other
key. Minted keys (the `curl`/scripting flow below) remain the only option
for a client that isn't a PocketBase-authenticated browser session.

One-time setup, once per fresh `pb_data` volume:

1. In the PocketBase admin UI (`https://api.ryanzrau.dev/_/`), create a
   `users` record for the gateway (e.g. `llm-gateway@service.internal`) and
   check its `is_service` field. Put that email + password in `config.yaml`'s
   `auth.service_email`/`service_password`.
2. Create your own `users` record (or flip `is_admin` on an existing one) —
   this is the account the `tony` dashboard's Keys page uses. Sign in there
   to create/revoke keys and see usage day to day; the same thing by hand,
   e.g. for scripting:

   ```bash
   TOKEN=$(curl -s -X POST https://api.ryanzrau.dev/api/collections/users/auth-with-password \
     -H 'Content-Type: application/json' \
     -d '{"identity":"you@email.com","password":"your-password"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

   curl -s -X POST https://api.ryanzrau.dev/api/custom/llm/keys \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"label":"my-laptop"}'
   ```

   The response's `key` field is the plaintext key — **shown exactly once**;
   only its hash is ever stored. Save it somewhere real (password manager),
   not just your terminal scrollback.

A key generated this way (or later revoked) shows up for the gateway within
`key_refresh_seconds`.

## Run

```bash
python3 gateway.py --config config.yaml
```

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "9b", "messages": [{"role": "user", "content": "hi"}]}'
```

First request to a model is slow (load time). Same model on subsequent requests
reuses the running process.

**Any request-body param not shown above already works** — `temperature`,
`top_p`, `max_tokens`, `seed`, `stream`/`stream_options`, and anything else your
`llama-server` build accepts pass straight through to it untouched; this file
only ever touches `model` (alias → real name) and, for `/v1/chat/send`,
forces `stream: true`. Tony's Playground (`apps/tony/src/PlaygroundPage.tsx`)
puts dedicated controls in front of the common ones plus a streaming toggle,
and a raw-JSON field for everything else — see that app's Docs page for the
user-facing version of this reference.

**Reasoning budget**: fixed per model in `config.yaml`, not per-request. If your
`llama-server` build accepts `reasoning_budget` in the request body, that already
passes through untouched — no gateway change needed.

**Context size**: also fixed per model in `config.yaml` (`args.ctx-size`),
set when that model's `llama-server` process starts — not something a
request can override, since it's a server startup flag, not a chat-completion
parameter.

## Web search (optional)

Set `web_search.searxng_url` in `config.yaml` to a running SearXNG instance
(see `config.example.yaml`) and `/v1/chat/send` starts offering the model a
`web_search` tool automatically — nothing else to configure. Leave it unset
and Chat behaves exactly as before.

SearXNG itself has no GPU need, unlike `llama-server` (see Limitations below)
— running it in Docker on the same Mac as the gateway is fine.

1. **Run the container**, bound to `127.0.0.1` only — this is a local search
   backend for `gateway.py` on the same machine, not something to expose to
   the LAN or internet:

   ```bash
   mkdir -p ~/searxng
   docker run -d --name searxng \
     --restart unless-stopped \
     -p 127.0.0.1:8080:8080 \
     -v ~/searxng:/etc/searxng \
     searxng/searxng:latest
   ```

   First run generates a default `~/searxng/settings.yml`.

2. **Enable the JSON API.** SearXNG's default `settings.yml` only enables the
   `html` output format — the JSON API `gateway.py` needs will 403 until you
   add `json` to `search.formats` and set a `secret_key`. Edit
   `~/searxng/settings.yml`:

   ```yaml
   search:
     formats:
       - html
       - json
   server:
     secret_key: "generate-one-with-openssl-rand-hex-32" # `openssl rand -hex 32`
   ```

   Then `docker restart searxng` to pick it up.

3. **Point the gateway at it** — `config.yaml`:

   ```yaml
   web_search:
     searxng_url: "http://127.0.0.1:8080"
   ```

   Restart `gateway.py` (or `launchctl kickstart` it, if you've set up
   continuous deploy) to pick up the change.

Verify it's working: `curl "http://127.0.0.1:8080/search?q=test&format=json"`
should return JSON results, not a 403.

Whether a given model actually emits correct `tool_calls` depends on its
chat template — every model in `config.example.yaml` already runs with
`jinja: true`, which is required for this, but isn't a guarantee for every
GGUF.

## Link reading (optional)

Set `url_fetch.enabled: true` in `config.yaml` and `/v1/chat/send` starts
offering the model a `fetch_url` tool — given a link, it fetches the page and
converts its main content to markdown (via `trafilatura`) for the model to
read and respond about. Independent of the `web_search` section above: no
SearXNG needed, and either (or both) can be enabled on their own.

```yaml
url_fetch:
  enabled: true
```

SSRF-guarded the same way any server that fetches user-supplied URLs should
be: only `http`/`https` URLs are followed, every hostname (including at each
redirect hop) is resolved and rejected if any address is private, loopback,
link-local, multicast, or otherwise reserved — so the tool can't be pointed at
the gateway's own host, the LAN, or a cloud metadata endpoint. The response
body is capped (`MAX_FETCH_BYTES`) and the extracted markdown truncated
(`MAX_FETCH_CONTENT_CHARS`) before it reaches the model, so one large page
can't blow up a turn's context. A fetch failure (bad host, timeout, no
extractable content) degrades to an `{"error": ...}` tool result rather than
failing the chat turn, the same as `web_search`.

## File reading and writing

Chat (`/v1/chat/send`) can read documents the user attaches and, optionally,
create files for the user to download.

**Reading** is always available, no config needed — it's the user's own
action, not a tool the model chooses to invoke. Attach a pdf/csv/txt/md
document (`attachments: [{filename, data_url}]` in the request body,
`data_url` being a `data:<mime>;base64,<data>` URL — exactly what
`bluestar`'s `FileDropzone` hands back) and the gateway extracts its text
(`pypdf` for PDF, plain decode otherwise) before the model ever sees the
request. Capped both in raw upload size (`MAX_ATTACHMENT_BYTES`) and
extracted text length (`MAX_ATTACHMENT_TEXT_CHARS`). What's persisted and
shown in the chat bubble stays just what the user typed; the extracted text
rides along separately (`llm_chat_messages.attachments`) and gets folded
back in on every later turn that replays this message — see
`_compose_content_with_attachments` in `gateway.py` and its frontend twin in
`apps/tony/src/useChat.ts`.

**Writing** is opt-in — set `file_tools.enabled: true` and Chat also offers
the model a `write_file` tool: markdown, plain text, Python, HTML, or CSV
only, nothing executed anywhere, just handed back as a downloadable
attachment (`kind: "generated"`) on the assistant's message. Disallowed
extensions, an empty body, or content over `MAX_WRITE_FILE_CHARS` degrade to
an `{"error": ...}` tool result rather than failing the turn.

```yaml
file_tools:
  enabled: true
```

## System prompts

Chat (`/v1/chat/send`) resolves an effective system prompt for every turn:

1. A new chat may set its own `system_prompt` in the request body — stored on
   its `llm_chats` row from then on, editable later via
   `POST /api/custom/llm/chats/system_prompt` (`apps/pocketbase/pb_hooks/chat.pb.js`).
   An edit takes effect on the chat's _next_ turn, since the gateway resolves
   the stored value fresh each time rather than trusting whatever a given
   request happens to send — nothing is re-injected into already-generated
   messages.
2. Otherwise, `tony`'s Chat page falls back to the signed-in user's own
   `default_system_prompt` (a plain field on the `users` collection, edited
   directly via PocketBase's own self-service update rule — no gateway
   involvement).
3. Otherwise, no system message is sent at all — exactly today's behavior.

The gateway itself only ever sees the already-resolved value; it doesn't know
about per-user defaults.

## Compaction

A long-running chat eventually fills its model's context window (surfaced to
the user as a usage meter in `tony`, driven by `GET /v1/models`'
`context_size` and the latest assistant reply's `prompt_tokens`). `POST
/v1/chat/compact` is the escape valve: given a transcript (the client decides
what's old enough to fold in — `tony`'s `useChat.ts` keeps the last few turns
verbatim), it runs one plain, non-streaming completion asking the model to
summarize it, then persists the result via `POST /api/custom/llm/chats/compact`
(`apps/pocketbase/pb_hooks/chat.pb.js`) as `llm_chats.summary` +
`summarized_through` (a `created` timestamp cursor). From then on,
`/v1/chat/send` folds the summary into the same effective-system-prompt slot
system prompts use (see above), and the client stops replaying any message at
or before `summarized_through` — the summary stands in for it instead.
Compacting again later is additive: the existing summary rides along in the
new transcript, so `summarized_through` only ever moves forward.

## Routes

| Route                       | Auth | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`               | no   | gateway + loaded-model status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /v1/models`            | yes  | configured models + aliases + per-model `vision`, `context_size` (from `args.ctx-size`), `size_bytes` (stat'd off `model_path`), `description`, `best_for`                                                                                                                                                                                                                                                                                                                                                                                              |
| `POST /v1/chat/completions` | yes  | chat, streaming, vision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /v1/chat/send`        | yes  | persistent chat turn (`tony`'s Chat page), optional `system_prompt` on a new chat and `attachments` on any turn — generation runs as a background task in PocketBase (`llm_chats`/`llm_chat_messages`, via `apps/pocketbase/pb_hooks/chat.pb.js`) independent of the request, so it keeps going and gets saved even if the client disconnects. The response is an SSE relay of the same chunks for as long as the client stays connected; a client that leaves polls `GET /api/custom/llm/chats/messages?chat=<id>` instead to see the finished result. |
| `POST /v1/chat/compact`     | yes  | summarizes an older portion of a chat (one plain completion, no background task, no streaming) and persists the summary — see Compaction above                                                                                                                                                                                                                                                                                                                                                                                                          |

## Limitations

- One model loaded at a time (fits 16GB unified memory). More RAM → would need a
  per-model port pool instead of a single swap slot.
- `model_idle_timeout_seconds: 0` keeps the loaded model resident indefinitely.
- Streaming passed through as SSE.
- `llama-server` crash on startup → gateway returns 500, not a hang. The
  failure (including a tail of its stderr) is logged server-side; the client
  only gets FastAPI's generic 500 body, not the stderr tail itself.
- Every call that reaches `manager.acquire` — success, an upstream error, or
  a connection dropped mid-stream — gets exactly one usage row, via a small
  `UsageTracker` context manager each of `/v1/chat/completions`,
  `/v1/chat/send`, and the streaming path wrap around the actual model call
  (`gateway.py`). A call is never silently untracked; the worst case is a
  row with `0`/`0` tokens rather than no row at all. Token counts themselves
  still come from the upstream response's `usage` field (or, for a streamed
  response, whichever chunk carries it — usually the last one); if
  `llama-server` doesn't include `usage` at all, or a stream is cut off
  before that chunk arrives, the row's counts are `0` — every request this
  gateway sends already sets `stream_options: {"include_usage": true}`
  precisely so a streamed response includes it, but verify your
  `llama-server` build actually honors that flag if you're still seeing
  `0`s on calls that otherwise completed normally.
- New keys and revocations take up to `key_refresh_seconds` to take effect —
  the gateway validates against its last successful pull, not PocketBase
  directly, so it keeps working through a brief PocketBase outage.
- CORS is locked to `https://tony.ryanzrau.dev` (plus any `http://localhost:*`
  origin, for local dev) so the `tony` dashboard's Playground can call this
  from the browser. It's a fixed constant in `gateway.py`, not something in
  `config.yaml` — there's only one real caller, and it can't be read from
  config anyway (`add_middleware` runs before `--config` is parsed).
