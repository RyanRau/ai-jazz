"""LLM Gateway: auth + on-demand model swap + concurrency cap in front of llama-server.

Run: python3 gateway.py --config config.yaml
"""

import argparse
import asyncio
import hashlib
import ipaddress
import json
import os
import signal
import socket
import sys
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import urlparse

import httpx
import trafilatura
import uvicorn
import yaml
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

CONFIG: dict = {}
bearer_scheme = HTTPBearer(auto_error=False)


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        cfg = yaml.safe_load(f)
    lookup = {}
    for m in cfg["models"]:
        lookup[m["name"]] = m
        for alias in m.get("aliases", []):
            lookup[alias] = m
    cfg["_model_lookup"] = lookup
    return cfg


def resolve_model(model_field: Optional[str]) -> dict:
    lookup = CONFIG["_model_lookup"]
    if not model_field:
        return lookup.get("default", CONFIG["models"][0])
    if model_field not in lookup:
        available = sorted({m["name"] for m in CONFIG["models"]})
        raise HTTPException(
            400, f"Unknown model '{model_field}'. Available: {available}"
        )
    return lookup[model_field]


async def check_api_key(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """Returns the matched key's PocketBase record id and owning user id --
    usage attribution needs the former, the chat routes need the latter to
    attribute a new chat/message to the right person.

    Accepts two credential shapes on the same Authorization header: an
    opaque `llm_api_keys` key (checked locally against the cached hash set,
    no network call) or -- on a miss -- a live PocketBase user session
    token (Tony's own browser sends this; see key_store.resolve_session),
    which resolves to that user's own server-managed default key. A token
    that's neither just fails both and 401s.
    """
    if not creds:
        raise HTTPException(401, "Invalid or missing API key")
    entry = key_store.check(creds.credentials)
    if not entry:
        entry = await key_store.resolve_session(creds.credentials)
    if not entry:
        raise HTTPException(401, "Invalid or missing API key")
    return {"key_id": entry["id"], "user_id": entry["user"]}


class KeyStore:
    """Caches active API-key hashes pulled from PocketBase, resolves
    PocketBase user session tokens (see resolve_session) on demand with a
    short per-token cache, and batches usage rows back to PocketBase.
    Deny-by-default for the key-hash path: a key is only ever accepted if
    it's present in the last successful pull, so a PocketBase outage can't
    turn into open access -- it can only make new keys and revocations take
    effect late, using the last known-good cache in the meantime. The
    session-token path instead asks PocketBase fresh (subject to its own
    short cache), since there's no way to pre-pull tokens PocketBase hasn't
    issued yet.
    """

    def __init__(self, cfg: dict):
        auth_cfg = cfg["auth"]
        self.service_email = auth_cfg["service_email"]
        self.service_password = auth_cfg["service_password"]
        self.refresh_interval = auth_cfg.get("key_refresh_seconds", 60)
        self.flush_interval = auth_cfg.get("usage_flush_seconds", 20)
        self.session_cache_ttl = auth_cfg.get("session_cache_seconds", 60)
        self._token: Optional[str] = None
        self._active_hashes: dict[str, dict] = {}  # sha256(key) -> {"id", "user"}
        # sha256(session token) -> ({"id", "user"}, cached-until epoch seconds).
        # Session tokens aren't known ahead of time the way llm_api_keys are
        # (they're minted by PocketBase itself on login, not by us), so this
        # can't be a periodic wholesale pull like _active_hashes -- each
        # distinct token gets resolved against PocketBase once and cached
        # briefly, rather than round-tripped on every request.
        self._session_cache: dict[str, tuple[dict, float]] = {}
        self._usage_queue: asyncio.Queue = asyncio.Queue(maxsize=10_000)
        self._client = httpx.AsyncClient(
            base_url=auth_cfg["pocketbase_url"].rstrip("/"), timeout=10
        )
        self._refresh_task: Optional[asyncio.Task] = None
        self._flush_task: Optional[asyncio.Task] = None

    def start(self):
        self._refresh_task = asyncio.create_task(self._refresh_loop())
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def stop(self):
        for task in (self._refresh_task, self._flush_task):
            if task:
                task.cancel()
        await self._client.aclose()

    def check(self, presented_key: str) -> Optional[dict]:
        digest = hashlib.sha256(presented_key.encode()).hexdigest()
        return self._active_hashes.get(digest)

    async def resolve_session(self, token: str) -> Optional[dict]:
        """Resolves a PocketBase user session token (not one of our own
        opaque keys, or check() above would already have matched it) to
        that user's own default key, by forwarding the token to PocketBase's
        POST /keys/default -- which authenticates it as that user's own
        session, not ours. Caches successes briefly; failures aren't
        cached, since a garbage/expired token is already a fast, cheap
        rejection on PocketBase's side."""
        digest = hashlib.sha256(token.encode()).hexdigest()
        now = time.time()
        cached = self._session_cache.get(digest)
        if cached and cached[1] > now:
            return cached[0]
        try:
            r = await self._client.post(
                "/api/custom/llm/keys/default",
                headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
        except httpx.HTTPError:
            return None
        data = r.json()
        entry = {"id": data["key_id"], "user": data["user_id"]}
        self._session_cache[digest] = (entry, now + self.session_cache_ttl)
        return entry

    def record_usage(self, key_id: str, model: str, tokens_in: int, tokens_out: int):
        row = {
            "key_id": key_id,
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
        }
        try:
            self._usage_queue.put_nowait(row)
        except asyncio.QueueFull:
            print("[gateway] usage queue full, dropping oldest usage record")
            self._usage_queue.get_nowait()
            self._usage_queue.put_nowait(row)

    async def _authenticate(self):
        r = await self._client.post(
            "/api/collections/users/auth-with-password",
            json={"identity": self.service_email, "password": self.service_password},
        )
        r.raise_for_status()
        self._token = r.json()["token"]

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        if not self._token:
            await self._authenticate()
        headers = {"Authorization": f"Bearer {self._token}"}
        r = await self._client.request(method, path, headers=headers, **kwargs)
        if r.status_code == 401:
            await self._authenticate()
            headers = {"Authorization": f"Bearer {self._token}"}
            r = await self._client.request(method, path, headers=headers, **kwargs)
        r.raise_for_status()
        return r

    async def _refresh_loop(self):
        while True:
            try:
                r = await self._request("GET", "/api/custom/llm/keys/active")
                self._active_hashes = {
                    row["key_hash"]: {"id": row["id"], "user": row.get("user", "")}
                    for row in r.json()["keys"]
                }
            except httpx.HTTPError as e:
                print(f"[gateway] key refresh failed, keeping cached keys: {e}")
            # Piggyback pruning expired session-cache entries on this same
            # tick rather than running a separate loop for it.
            now = time.time()
            self._session_cache = {
                digest: entry
                for digest, entry in self._session_cache.items()
                if entry[1] > now
            }
            await asyncio.sleep(self.refresh_interval)

    async def _flush_loop(self):
        while True:
            await asyncio.sleep(self.flush_interval)
            rows = []
            while not self._usage_queue.empty() and len(rows) < 200:
                rows.append(self._usage_queue.get_nowait())
            if not rows:
                continue
            try:
                await self._request(
                    "POST", "/api/custom/llm/usage", json={"rows": rows}
                )
            except httpx.HTTPStatusError as e:
                # A 4xx means PocketBase rejected the rows themselves (bad
                # data, a schema mismatch) -- retrying the exact same
                # payload would just 4xx again forever, quietly consuming
                # queue capacity while never actually recording the calls
                # it's holding. Log and drop rather than requeue, so a data
                # problem shows up as a loud, visible log line instead of
                # calls silently never landing. Anything else (a 5xx, e.g.
                # PocketBase mid-restart) is worth retrying.
                if 400 <= e.response.status_code < 500:
                    print(
                        f"[gateway] usage flush rejected ({e.response.status_code}), "
                        f"dropping {len(rows)} rows -- check the request/response for why: {e}"
                    )
                else:
                    print(
                        f"[gateway] usage flush failed ({e.response.status_code}), "
                        f"re-queueing {len(rows)} rows: {e}"
                    )
                    for row in rows:
                        try:
                            self._usage_queue.put_nowait(row)
                        except asyncio.QueueFull:
                            break
            except httpx.HTTPError as e:
                print(
                    f"[gateway] usage flush failed (network), re-queueing {len(rows)} rows: {e}"
                )
                for row in rows:
                    try:
                        self._usage_queue.put_nowait(row)
                    except asyncio.QueueFull:
                        break


class UsageTracker:
    """Guarantees `key_store.record_usage(...)` fires exactly once per
    generation attempt -- success, upstream error, or a caller disconnect --
    with whatever token counts `update()` last saw (0/0 if the upstream
    response never included a `usage` field at all). Every call site that
    actually invokes llama-server wraps its work in this instead of calling
    `record_usage` inline, so "did this call get tracked" doesn't depend on
    each site separately remembering a `finally`/`except` that also records
    usage -- forgetting one (as `/v1/chat/send` did; see
    _generate_chat_response) used to mean that call just vanished from the
    Keys page with no trace, success or failure.
    """

    def __init__(self, key_id: str, model: str):
        self.key_id = key_id
        self.model = model
        self.tokens_in = 0
        self.tokens_out = 0

    def update(self, usage: dict):
        if usage.get("prompt_tokens") is not None:
            self.tokens_in = usage["prompt_tokens"]
        if usage.get("completion_tokens") is not None:
            self.tokens_out = usage["completion_tokens"]

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        key_store.record_usage(self.key_id, self.model, self.tokens_in, self.tokens_out)
        return False


key_store: Optional[KeyStore] = None


class ModelManager:
    """Owns the single llama-server child process and swaps it on demand."""

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.process: Optional[asyncio.subprocess.Process] = None
        self.current_model_name: Optional[str] = None
        self.active_requests = 0
        self.last_used = time.time()
        self.cv = asyncio.Condition()
        self.max_parallel = cfg["server"]["max_parallel_requests"]
        self.llama_host = cfg["llama_server"]["host"]
        self.llama_port = cfg["llama_server"]["port"]
        self.base_url = f"http://{self.llama_host}:{self.llama_port}"
        self._stderr_task: Optional[asyncio.Task] = None
        self._stderr_tail: deque = deque(maxlen=40)

    async def acquire(self, model_cfg: dict):
        async with self.cv:
            while True:
                same_model = self.current_model_name == model_cfg["name"]
                if same_model and self.active_requests < self.max_parallel:
                    self.active_requests += 1
                    self.last_used = time.time()
                    return
                if self.active_requests == 0:
                    # Safe to swap: no in-flight requests against the current model.
                    if not same_model:
                        await self._swap(model_cfg)
                    self.active_requests += 1
                    self.last_used = time.time()
                    return
                await self.cv.wait()

    async def release(self):
        async with self.cv:
            self.active_requests -= 1
            self.last_used = time.time()
            self.cv.notify_all()

    async def start_idle_reaper(self):
        timeout = self.cfg["server"].get("model_idle_timeout_seconds", 0)
        if not timeout:
            return
        while True:
            await asyncio.sleep(30)
            async with self.cv:
                if (
                    self.process
                    and self.active_requests == 0
                    and time.time() - self.last_used > timeout
                ):
                    print(f"[gateway] unloading '{self.current_model_name}' (idle)")
                    await self._stop_process()
                    self.current_model_name = None

    async def shutdown(self):
        await self._stop_process()

    async def _swap(self, model_cfg: dict):
        print(f"[gateway] swap: {self.current_model_name} -> {model_cfg['name']}")
        await self._stop_process()
        await self._start_process(model_cfg)
        self.current_model_name = model_cfg["name"]

    async def _stop_process(self):
        if self.process is None:
            return
        process, self.process = self.process, None
        if self._stderr_task:
            self._stderr_task.cancel()
            self._stderr_task = None
        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=15)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()

    async def _start_process(self, model_cfg: dict):
        argv = [
            self.cfg["llama_server"]["binary"],
            "--model",
            os.path.expanduser(model_cfg["model_path"]),
            "--host",
            self.llama_host,
            "--port",
            str(self.llama_port),
        ]
        if model_cfg.get("vision") and model_cfg.get("mmproj_path"):
            argv += ["--mmproj", os.path.expanduser(model_cfg["mmproj_path"])]
        for key, value in model_cfg.get("args", {}).items():
            flag = f"--{key}"
            if isinstance(value, bool):
                if value:
                    argv.append(flag)
            else:
                argv += [flag, str(value)]

        self._stderr_tail.clear()
        self.process = await asyncio.create_subprocess_exec(
            *argv, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
        )
        self._stderr_task = asyncio.create_task(self._drain_stderr(self.process))
        await self._wait_healthy()

    async def _drain_stderr(self, process: "asyncio.subprocess.Process"):
        assert process.stderr is not None
        async for line in process.stderr:
            self._stderr_tail.append(line.decode(errors="replace").rstrip())

    async def _wait_healthy(self):
        timeout = self.cfg["llama_server"].get("startup_timeout_seconds", 180)
        deadline = time.time() + timeout
        async with httpx.AsyncClient() as client:
            while time.time() < deadline:
                if self.process.returncode is not None:
                    tail = "\n".join(self._stderr_tail) or "(no output captured)"
                    raise RuntimeError(
                        f"llama-server exited early (code {self.process.returncode}):\n{tail}"
                    )
                try:
                    r = await client.get(f"{self.base_url}/health", timeout=3)
                    if r.status_code == 200:
                        return
                except (httpx.ConnectError, httpx.ReadTimeout):
                    pass
                await asyncio.sleep(1)
        raise RuntimeError("Timed out waiting for llama-server to become healthy")


manager: Optional[ModelManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global manager, key_store
    manager = ModelManager(CONFIG)
    key_store = KeyStore(CONFIG)
    key_store.start()
    reaper = asyncio.create_task(manager.start_idle_reaper())
    yield
    reaper.cancel()
    await manager.shutdown()
    await key_store.stop()


# Fixed, not config-driven: there's exactly one browser client that ever
# calls this cross-origin (tony.ryanzrau.dev), and CORS is a security
# boundary, not a deployment knob. It also has to be a module-level constant
# rather than read from CONFIG -- add_middleware() runs at import time,
# before main() has parsed --config.
ALLOWED_ORIGINS = ["https://tony.ryanzrau.dev"]
LOCAL_DEV_ORIGIN_REGEX = r"http://localhost:\d+"

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=LOCAL_DEV_ORIGIN_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health():
    if manager is None or manager.process is None:
        return {"status": "ok", "loaded_model": None, "process_alive": False}
    return {
        "status": "ok",
        "loaded_model": manager.current_model_name,
        "process_alive": manager.process.returncode is None,
    }


def _model_size_bytes(model_cfg: dict) -> Optional[int]:
    """Best-effort size of the GGUF on disk, for the model picker's "size"
    column -- not something worth failing /v1/models over if the path is
    momentarily missing (e.g. an external drive not mounted yet)."""
    try:
        return os.path.getsize(os.path.expanduser(model_cfg["model_path"]))
    except OSError:
        return None


@app.get("/v1/models", dependencies=[Depends(check_api_key)])
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": m["name"],
                "object": "model",
                "aliases": m.get("aliases", []),
                "vision": m.get("vision", False),
                # ctx-size is already a per-model llama-server startup flag
                # (see config.yaml) -- surfaced here too so a client doesn't
                # have to hardcode it, e.g. for a context-usage indicator.
                "context_size": m.get("args", {}).get("ctx-size"),
                "size_bytes": _model_size_bytes(m),
                "description": m.get("description"),
                "best_for": m.get("best_for"),
            }
            for m in CONFIG["models"]
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: Request, auth: dict = Depends(check_api_key)):
    key_id = auth["key_id"]
    body = await request.json()
    model_cfg = resolve_model(body.get("model"))

    if _contains_image(body) and not model_cfg.get("vision"):
        raise HTTPException(
            400, f"Model '{model_cfg['name']}' does not support image input."
        )

    body["model"] = model_cfg["name"]  # normalize alias -> real name before forwarding

    await manager.acquire(model_cfg)
    timeout = CONFIG["server"].get("request_timeout_seconds", 300)
    client = httpx.AsyncClient(base_url=manager.base_url, timeout=timeout)

    if body.get("stream"):
        # manager.release() runs inside the generator's finally, once the stream
        # actually finishes -- releasing here would let a swap start mid-stream.
        return await _proxy_stream(client, body, manager.release, key_id)

    try:
        async with UsageTracker(key_id, model_cfg["name"]) as tracker:
            r = await client.post("/v1/chat/completions", json=body)
            data = r.json()
            tracker.update(data.get("usage") or {})
            return JSONResponse(data, status_code=r.status_code)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Upstream llama-server error: {e}")
    finally:
        await client.aclose()
        await manager.release()


def _parse_sse_json_lines(
    new_bytes: bytes, leftover: bytes
) -> tuple[list[dict], bytes]:
    """Splits `leftover + new_bytes` into complete lines, JSON-parses any
    `data: {...}` line (skipping keepalives/`[DONE]`), and returns the
    parsed objects plus whatever trailing partial line should carry over to
    the next call. Shared by every place that needs to look *inside* an
    SSE stream without disturbing the raw bytes also being relayed
    downstream unmodified.
    """
    buf = leftover + new_bytes
    *lines, new_leftover = buf.split(b"\n")
    parsed: list[dict] = []
    for line in lines:
        line = line.strip()
        if not line.startswith(b"data:"):
            continue
        payload = line[len(b"data:") :].strip()
        if payload in (b"", b"[DONE]"):
            continue
        try:
            parsed.append(json.loads(payload))
        except ValueError:
            continue
    return parsed, new_leftover


async def _proxy_stream(
    client: httpx.AsyncClient, body: dict, release, key_id: str
) -> StreamingResponse:
    model_name = body["model"]

    async def gen():
        leftover = b""
        try:
            async with UsageTracker(key_id, model_name) as tracker:
                async with client.stream(
                    "POST", "/v1/chat/completions", json=body
                ) as r:
                    async for chunk in r.aiter_bytes():
                        yield chunk
                        # Look for a `usage` field in each SSE chunk (OpenAI-style
                        # servers put it in the final one) without buffering the
                        # whole stream.
                        events, leftover = _parse_sse_json_lines(chunk, leftover)
                        for ev in events:
                            if ev.get("usage"):
                                tracker.update(ev["usage"])
        finally:
            await client.aclose()
            await release()

    return StreamingResponse(gen(), media_type="text/event-stream")


def _contains_image(body: dict) -> bool:
    for msg in body.get("messages", []):
        content = msg.get("content")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    return True
    return False


WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": (
            "Search the web for current information. Use this for anything "
            "time-sensitive or that may have changed since training."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query."}
            },
            "required": ["query"],
        },
    },
}


async def _web_search(query: str) -> list[dict]:
    """Queries the configured SearXNG instance and returns the top results
    as plain dicts. Any failure (SearXNG down, misconfigured, network error)
    degrades to an empty result list rather than failing the chat turn."""
    searxng_url = (CONFIG.get("web_search") or {}).get("searxng_url")
    if not searxng_url:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{searxng_url.rstrip('/')}/search",
                params={"q": query, "format": "json"},
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        print(f"[gateway] web search failed: {e}")
        return []
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "snippet": item.get("content", ""),
        }
        for item in (data.get("results") or [])[:5]
    ]


FETCH_URL_TOOL = {
    "type": "function",
    "function": {
        "name": "fetch_url",
        "description": (
            "Fetch a specific web page by URL and return its main content as "
            "markdown. Use this when the user gives you a link and asks what "
            "it's about, or to read/summarize it -- not for open-ended search."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The URL to fetch."}
            },
            "required": ["url"],
        },
    },
}

MAX_FETCH_BYTES = 2_000_000
MAX_FETCH_CONTENT_CHARS = 8000
MAX_FETCH_REDIRECTS = 5


async def _is_public_host(hostname: str) -> bool:
    """Rejects a hostname that resolves to any private/loopback/link-local/
    reserved/multicast address, so the fetch_url tool can't be turned into a
    probe against the gateway's own host, the LAN, or a cloud metadata
    endpoint. Every resolved address must be public, not just the first.
    getaddrinfo is a blocking call -- run off-loop so one slow/hanging DNS
    lookup can't stall every other request this single-process gateway is
    handling.
    """
    try:
        infos = await asyncio.get_running_loop().run_in_executor(
            None, socket.getaddrinfo, hostname, None
        )
    except socket.gaierror:
        return False
    if not infos:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


async def _fetch_url(url: str) -> dict:
    """Fetches a URL and extracts its main content as markdown (trafilatura),
    for the fetch_url tool. SSRF-guarded: only plain http/https URLs whose
    host resolves exclusively to public addresses are fetched, redirects are
    manually followed (capped) so each hop gets the same host check rather
    than trusting httpx to follow into somewhere internal, and the response
    body is capped so a huge page can't blow up the tool result. Any failure
    degrades to an {"error": ...} result rather than failing the chat turn,
    same as _web_search.
    """
    current = url
    for _ in range(MAX_FETCH_REDIRECTS):
        parsed = urlparse(current)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return {"url": current, "error": "Only http/https URLs are supported."}
        if not await _is_public_host(parsed.hostname):
            return {"url": current, "error": "That host can't be fetched."}

        try:
            async with httpx.AsyncClient(follow_redirects=False, timeout=10) as client:
                async with client.stream("GET", current) as r:
                    if r.is_redirect:
                        location = r.headers.get("location")
                        if not location:
                            return {"url": current, "error": "Redirect with no location."}
                        current = str(httpx.URL(current).join(location))
                        continue
                    if r.status_code >= 400:
                        return {"url": current, "error": f"HTTP {r.status_code}"}
                    raw = bytearray()
                    async for chunk in r.aiter_bytes():
                        raw += chunk
                        if len(raw) > MAX_FETCH_BYTES:
                            break
                    html = bytes(raw).decode(r.charset_encoding or "utf-8", errors="replace")
        except httpx.HTTPError as e:
            return {"url": current, "error": f"Fetch failed: {e}"}

        content = (
            trafilatura.extract(html, output_format="markdown", include_links=False, url=current)
            or ""
        ).strip()
        if not content:
            return {"url": current, "error": "Couldn't extract readable content."}
        meta = trafilatura.extract_metadata(html)
        return {
            "url": current,
            "title": meta.title if meta else None,
            "content": content[:MAX_FETCH_CONTENT_CHARS],
        }
    return {"url": current, "error": "Too many redirects."}


async def _append_chat_message(
    message_id: str,
    content: str,
    status: str,
    tokens_in: int = 0,
    tokens_out: int = 0,
    response_ms: Optional[int] = None,
    tool_calls: Optional[list[dict]] = None,
):
    """Persists the running (or final) content of a chat message via
    PocketBase's service-account-only route. Best-effort: a failure here
    logs and moves on rather than raising -- losing one periodic save
    mid-stream shouldn't kill the generation, and the final "complete" call
    is what actually matters for durability.
    """
    payload = {"message_id": message_id, "content": content, "status": status}
    if status == "complete":
        payload["tokens_in"] = tokens_in
        payload["tokens_out"] = tokens_out
        if response_ms is not None:
            payload["response_ms"] = response_ms
    if tool_calls:
        payload["tool_calls"] = json.dumps(tool_calls)
    try:
        await key_store._request(
            "POST", "/api/custom/llm/chats/messages/append", json=payload
        )
    except httpx.HTTPError as e:
        print(f"[gateway] failed to persist chat message {message_id}: {e}")


MAX_TOOL_ROUNDS = 3


async def _generate_chat_response(
    model_cfg: dict,
    body: dict,
    key_id: str,
    assistant_message_id: str,
    queue: "asyncio.Queue[Optional[bytes]]",
):
    """Runs as its own asyncio task, independent of the HTTP request that
    started it -- this is deliberate, it's what lets generation keep going
    (and get saved) after the caller disconnects. Republishes raw SSE
    chunks to `queue` for whoever's currently watching (if anyone), and
    periodically persists the accumulated text to PocketBase so a later
    visit sees it too. Puts `None` on the queue when done, as the
    end-of-stream sentinel for a live relay.

    Loops up to MAX_TOOL_ROUNDS times when web search and/or url fetching is
    configured: a round that ends in a tool call runs it and feeds the
    result back as a `tool` message for the next round, instead of treating
    that round as the final answer. Tool-call chunks carry no
    `delta.content`, so the frontend (which only ever looks at
    `delta.content`) silently ignores them -- no special client-side
    handling needed.
    """
    FLUSH_INTERVAL = 0.75

    content_parts: list[str] = []
    search_records: list[dict] = []
    last_flush = time.time()
    start = time.time()
    acquired = False
    client: Optional[httpx.AsyncClient] = None

    searxng_url = (CONFIG.get("web_search") or {}).get("searxng_url")
    url_fetch_enabled = (CONFIG.get("url_fetch") or {}).get("enabled", False)
    tools = []
    if searxng_url:
        tools.append(WEB_SEARCH_TOOL)
    if url_fetch_enabled:
        tools.append(FETCH_URL_TOOL)
    if tools:
        body = {**body, "tools": tools}

    try:
        async with UsageTracker(key_id, model_cfg["name"]) as tracker:
            await manager.acquire(model_cfg)
            acquired = True
            timeout = CONFIG["server"].get("request_timeout_seconds", 300)
            client = httpx.AsyncClient(base_url=manager.base_url, timeout=timeout)

            for round_num in range(MAX_TOOL_ROUNDS):
                if round_num == MAX_TOOL_ROUNDS - 1:
                    body.pop("tools", None)  # force a text answer on the last round

                leftover = b""
                tool_calls: dict[int, dict] = {}
                async with client.stream(
                    "POST", "/v1/chat/completions", json=body
                ) as r:
                    async for chunk in r.aiter_bytes():
                        await queue.put(chunk)
                        events, leftover = _parse_sse_json_lines(chunk, leftover)
                        for ev in events:
                            if ev.get("usage"):
                                tracker.update(ev["usage"])
                            choices = ev.get("choices") or []
                            if not choices:
                                continue
                            delta = choices[0].get("delta") or {}
                            if delta.get("content"):
                                content_parts.append(delta["content"])
                            for tc in delta.get("tool_calls") or []:
                                slot = tool_calls.setdefault(
                                    tc.get("index", 0),
                                    {"id": "", "name": "", "arguments": ""},
                                )
                                if tc.get("id"):
                                    slot["id"] = tc["id"]
                                fn = tc.get("function") or {}
                                if fn.get("name"):
                                    slot["name"] += fn["name"]
                                if fn.get("arguments"):
                                    slot["arguments"] += fn["arguments"]
                        if time.time() - last_flush > FLUSH_INTERVAL:
                            await _append_chat_message(
                                assistant_message_id,
                                "".join(content_parts),
                                "streaming",
                                tool_calls=search_records,
                            )
                            last_flush = time.time()

                if not tool_calls:
                    break  # final answer for this turn

                ordered = [tool_calls[i] for i in sorted(tool_calls)]
                body["messages"] = body["messages"] + [
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tc["id"] or f"call_{i}",
                                "type": "function",
                                "function": {
                                    "name": tc["name"],
                                    "arguments": tc["arguments"],
                                },
                            }
                            for i, tc in enumerate(ordered)
                        ],
                    }
                ]
                for i, tc in enumerate(ordered):
                    try:
                        args = json.loads(tc["arguments"] or "{}")
                    except ValueError:
                        args = {}
                    if tc["name"] == "web_search":
                        query = args.get("query", "")
                        results = await _web_search(query)
                        search_records.append(
                            {"type": "web_search", "query": query, "results": results}
                        )
                        tool_result = results
                    elif tc["name"] == "fetch_url":
                        target = args.get("url", "")
                        fetched = (
                            await _fetch_url(target)
                            if target
                            else {"error": "No url given."}
                        )
                        search_records.append({"type": "fetch_url", **fetched})
                        tool_result = fetched
                    else:
                        tool_result = {"error": f"Unknown tool '{tc['name']}'."}
                    body["messages"].append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"] or f"call_{i}",
                            "content": json.dumps(tool_result),
                        }
                    )

            await _append_chat_message(
                assistant_message_id,
                "".join(content_parts),
                "complete",
                tokens_in=tracker.tokens_in,
                tokens_out=tracker.tokens_out,
                response_ms=int((time.time() - start) * 1000),
                tool_calls=search_records,
            )
    except Exception as e:
        print(f"[gateway] chat generation failed: {e}")
        await _append_chat_message(
            assistant_message_id,
            "".join(content_parts),
            "error",
            tool_calls=search_records,
        )
    finally:
        # acquire()/the client can fail before either exists -- guard both,
        # since a bare `finally` here previously left a message stuck at
        # "pending" forever (and any live watcher hanging) on an acquire
        # failure, which never entered the try block above.
        if client is not None:
            await client.aclose()
        if acquired:
            await manager.release()
        await queue.put(None)


@app.post("/v1/chat/send")
async def chat_send(request: Request, auth: dict = Depends(check_api_key)):
    """Starts (or continues) a chat turn. Body: { chat_id?, model, messages,
    system_prompt? } -- same shape as /v1/chat/completions, just with an
    optional chat_id to continue an existing conversation. system_prompt is
    only read when starting a new chat (chat_id empty); it's stored on the
    new llm_chats row and from then on the chat's own stored value is what's
    actually used, resolved fresh each turn (see effective_system_prompt
    below) rather than trusting whatever a given request happens to send.
    The actual generation runs as a standalone background task (see
    _generate_chat_response) that keeps going even if this request's
    connection drops; this handler's SSE response is just a live window
    onto it for as long as the caller stays connected.
    """
    body = await request.json()
    model_cfg = resolve_model(body.get("model"))

    if _contains_image(body) and not model_cfg.get("vision"):
        raise HTTPException(
            400, f"Model '{model_cfg['name']}' does not support image input."
        )

    body["model"] = model_cfg["name"]
    body["stream"] = True
    # Some llama-server builds only include token counts in a streamed
    # response's `usage` field when this is set (see the README's
    # Limitations section) -- without it, every chat message would still
    # get a usage row (UsageTracker always records one), just with 0/0
    # tokens, silently under-reporting real usage rather than omitting it.
    body["stream_options"] = {"include_usage": True}

    messages = body.get("messages") or []
    if not messages or messages[-1].get("role") != "user":
        raise HTTPException(400, "messages must end with a user turn.")
    user_content = messages[-1].get("content")
    if not isinstance(user_content, str):
        raise HTTPException(400, "Chat messages must be plain text.")

    # Only meaningful for a brand-new chat (chat_id empty) -- an existing
    # chat's system prompt already lives on its llm_chats row and is what
    # comes back from the create call below regardless of what's sent here.
    new_chat_system_prompt = body.pop("system_prompt", None)

    create = await key_store._request(
        "POST",
        "/api/custom/llm/chats/messages/create",
        json={
            "user_id": auth["user_id"],
            "chat_id": body.get("chat_id") or "",
            "model": model_cfg["name"],
            "content": user_content,
            "system_prompt": new_chat_system_prompt or "",
        },
    )
    ids = create.json()

    # Resolved server-side (the chat's own stored value, not whatever this
    # request happened to send) so an edit made via
    # POST /api/custom/llm/chats/system_prompt takes effect on the chat's
    # next turn without the client needing to resend it. Popped off `ids`
    # before it's relayed to the client as the "ids" SSE event below -- the
    # client already has this chat's system prompt from its own chats list.
    effective_system_prompt = (ids.pop("system_prompt", "") or "").strip()
    if effective_system_prompt:
        body["messages"] = [
            {"role": "system", "content": effective_system_prompt}
        ] + messages

    queue: "asyncio.Queue[Optional[bytes]]" = asyncio.Queue()
    asyncio.create_task(
        _generate_chat_response(
            model_cfg, body, auth["key_id"], ids["assistant_message_id"], queue
        )
    )

    async def relay():
        # The ids arrive as their own first SSE event -- the client needs
        # assistant_message_id to know what to poll if it leaves and comes
        # back before generation finishes.
        yield f"data: {json.dumps({'type': 'ids', **ids})}\n\n".encode()
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            yield chunk

    return StreamingResponse(relay(), media_type="text/event-stream")


def main():
    global CONFIG
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()
    CONFIG = load_config(args.config)

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    uvicorn.run(app, host=CONFIG["server"]["host"], port=CONFIG["server"]["port"])


if __name__ == "__main__":
    main()
