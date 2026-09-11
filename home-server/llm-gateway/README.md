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
  notes: |
    Freeform markdown shown in Tony's model info modal -- optional.
  args:
    ctx-size: 16384
    n-gpu-layers: 99
    jinja: true
```

Set `llama_server.binary` to your `llama-server` path (`which llama-server`).

`GET /v1/models` echoes back each model's `args.ctx-size` and
`args.reasoning-budget` as `context_size`/`reasoning_budget` (read-only --
neither is a request parameter, see the "Any request-body param..." section
under Run below) alongside `notes`, for Tony's model info modal.

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
`top_p`, `top_k`, `min_p`, `presence_penalty`, `frequency_penalty`,
`max_tokens`, `seed`, `reasoning_effort`, `stream`/`stream_options`, and
anything else your `llama-server` build accepts pass straight through to it
untouched; this file only ever touches `model` (alias → real name) and, for
`/v1/chat/send`, forces `stream: true`. Tony's Playground
(`apps/tony/src/PlaygroundPage.tsx`) and Chat (`apps/tony/src/ChatPage.tsx`,
via a saved-per-chat `params` field) both put dedicated controls in front
of these plus a raw-JSON field for everything else (shared between the two
in `apps/tony/src/modelParams.ts`/`ModelParamControls.tsx`) — see Tony's
Docs page for the user-facing version of this reference.

**Reasoning effort vs. reasoning budget** — easy to conflate, distinct
knobs: `reasoning_effort` (`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/
`max`) is a _per-request_ param some `llama-server` builds accept, passed
straight through untouched, same as any other request-body field above.
`reasoning_budget` is fixed per model in `config.yaml`'s `args` — a startup
flag, not a request parameter — and acts as the ceiling `reasoning_effort`
operates within, not the same setting under a different name.

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

## Routes

| Route                       | Auth | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`               | no   | gateway + loaded-model status                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /v1/models`            | yes  | configured models + aliases + per-model `vision`/`context_size`/`reasoning_budget`/`notes`                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /v1/chat/completions` | yes  | chat, streaming, vision                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `POST /v1/chat/send`        | yes  | persistent chat turn (`tony`'s Chat page) — generation runs as a background task in PocketBase (`llm_chats`/`llm_chat_messages`, via `apps/pocketbase/pb_hooks/chat.pb.js`) independent of the request, so it keeps going and gets saved even if the client disconnects. The response is an SSE relay of the same chunks for as long as the client stays connected; a client that leaves polls `GET /api/custom/llm/chats/messages?chat=<id>` instead to see the finished result. |

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
