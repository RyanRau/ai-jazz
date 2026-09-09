# LLM Gateway

Reverse-proxy in front of `llama-server`. Adds auth, on-demand model swap, and a
concurrency cap. OpenAI-compatible API.

```
                     ┌──────────────────────────────┐
 client ────────────▶│  gateway.py :8000             │
                     │  - API key check             │
                     │  - concurrency gate (N)      │
                     │  - swap llama-server if      │
                     │    "model" field changed     │
                     └──────────────┬────────────────┘
                                    │ spawns / proxies
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

Generate keys:
```bash
python3 -c "import secrets; print('sk-' + secrets.token_hex(24))"
```

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

**Reasoning budget**: fixed per model in `config.yaml`, not per-request. If your
`llama-server` build accepts `reasoning_budget` in the request body, that already
passes through untouched — no gateway change needed.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /health` | no | gateway + loaded-model status |
| `GET /v1/models` | yes | configured models + aliases |
| `POST /v1/chat/completions` | yes | chat, streaming, vision |

## Limitations

- One model loaded at a time (fits 16GB unified memory). More RAM → would need a
  per-model port pool instead of a single swap slot.
- `model_idle_timeout_seconds: 0` keeps the loaded model resident indefinitely.
- Streaming passed through as SSE.
- `llama-server` crash on startup → gateway returns 500 with the failure, not a hang.
