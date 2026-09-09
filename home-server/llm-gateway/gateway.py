"""LLM Gateway: auth + on-demand model swap + concurrency cap in front of llama-server.

Run: python3 gateway.py --config config.yaml
"""

import argparse
import asyncio
import hashlib
import json
import os
import signal
import sys
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Optional

import httpx
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


def check_api_key(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Returns the matched key's PocketBase record id, for usage attribution."""
    key_id = creds and key_store.check(creds.credentials)
    if not key_id:
        raise HTTPException(401, "Invalid or missing API key")
    return key_id


class KeyStore:
    """Caches active API-key hashes pulled from PocketBase, and batches usage
    rows back to it. Deny-by-default: a key is only ever accepted if it's
    present in the last successful pull, so a PocketBase outage can't turn
    into open access -- it can only make new keys and revocations take effect
    late, using the last known-good cache in the meantime.
    """

    def __init__(self, cfg: dict):
        auth_cfg = cfg["auth"]
        self.service_email = auth_cfg["service_email"]
        self.service_password = auth_cfg["service_password"]
        self.refresh_interval = auth_cfg.get("key_refresh_seconds", 60)
        self.flush_interval = auth_cfg.get("usage_flush_seconds", 20)
        self._token: Optional[str] = None
        self._active_hashes: dict[str, str] = {}  # sha256(key) -> PocketBase record id
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

    def check(self, presented_key: str) -> Optional[str]:
        digest = hashlib.sha256(presented_key.encode()).hexdigest()
        return self._active_hashes.get(digest)

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
                    row["key_hash"]: row["id"] for row in r.json()["keys"]
                }
            except httpx.HTTPError as e:
                print(f"[gateway] key refresh failed, keeping cached keys: {e}")
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
            except httpx.HTTPError as e:
                print(
                    f"[gateway] usage flush failed, re-queueing {len(rows)} rows: {e}"
                )
                for row in rows:
                    try:
                        self._usage_queue.put_nowait(row)
                    except asyncio.QueueFull:
                        break


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


@app.get("/v1/models", dependencies=[Depends(check_api_key)])
async def list_models():
    return {
        "object": "list",
        "data": [
            {"id": m["name"], "object": "model", "aliases": m.get("aliases", [])}
            for m in CONFIG["models"]
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: Request, key_id: str = Depends(check_api_key)):
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
        r = await client.post("/v1/chat/completions", json=body)
        data = r.json()
        usage = data.get("usage") or {}
        key_store.record_usage(
            key_id,
            model_cfg["name"],
            usage.get("prompt_tokens", 0),
            usage.get("completion_tokens", 0),
        )
        return JSONResponse(data, status_code=r.status_code)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Upstream llama-server error: {e}")
    finally:
        await client.aclose()
        await manager.release()


async def _proxy_stream(
    client: httpx.AsyncClient, body: dict, release, key_id: str
) -> StreamingResponse:
    model_name = body["model"]

    async def gen():
        usage: dict = {}
        leftover = b""
        try:
            async with client.stream("POST", "/v1/chat/completions", json=body) as r:
                async for chunk in r.aiter_bytes():
                    yield chunk
                    # Look for a `usage` field in each SSE chunk (OpenAI-style
                    # servers put it in the final one) without buffering the
                    # whole stream -- only an unterminated trailing line
                    # carries over to the next chunk.
                    leftover += chunk
                    *lines, leftover = leftover.split(b"\n")
                    for line in lines:
                        line = line.strip()
                        if not line.startswith(b"data:"):
                            continue
                        payload = line[len(b"data:") :].strip()
                        if payload in (b"", b"[DONE]"):
                            continue
                        try:
                            parsed = json.loads(payload)
                        except ValueError:
                            continue
                        if parsed.get("usage"):
                            usage = parsed["usage"]
        finally:
            await client.aclose()
            key_store.record_usage(
                key_id,
                model_name,
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
            )
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
