"""LLM Gateway: auth + on-demand model swap + concurrency cap in front of llama-server.

Run: python3 gateway.py --config config.yaml
"""

import argparse
import asyncio
import os
import secrets
import signal
import subprocess
import sys
import time
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import uvicorn
import yaml
from fastapi import FastAPI, Request, HTTPException, Depends
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
        raise HTTPException(400, f"Unknown model '{model_field}'. Available: {available}")
    return lookup[model_field]


def check_api_key(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    keys = CONFIG["auth"]["api_keys"]
    if not creds or not any(secrets.compare_digest(creds.credentials, k) for k in keys):
        raise HTTPException(401, "Invalid or missing API key")
    return True


class ModelManager:
    """Owns the single llama-server child process and swaps it on demand."""

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.process: Optional[subprocess.Popen] = None
        self.current_model_name: Optional[str] = None
        self.active_requests = 0
        self.last_used = time.time()
        self.cv = asyncio.Condition()
        self.max_parallel = cfg["server"]["max_parallel_requests"]
        self.llama_host = cfg["llama_server"]["host"]
        self.llama_port = cfg["llama_server"]["port"]
        self.base_url = f"http://{self.llama_host}:{self.llama_port}"

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
                if self.process and self.active_requests == 0 and time.time() - self.last_used > timeout:
                    print(f"[gateway] unloading '{self.current_model_name}' (idle)")
                    self._stop_process()
                    self.current_model_name = None

    def shutdown(self):
        self._stop_process()

    async def _swap(self, model_cfg: dict):
        print(f"[gateway] swap: {self.current_model_name} -> {model_cfg['name']}")
        self._stop_process()
        await self._start_process(model_cfg)
        self.current_model_name = model_cfg["name"]

    def _stop_process(self):
        if self.process is None:
            return
        self.process.terminate()
        try:
            self.process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=15)
        self.process = None

    async def _start_process(self, model_cfg: dict):
        argv = [
            self.cfg["llama_server"]["binary"],
            "--model", os.path.expanduser(model_cfg["model_path"]),
            "--host", self.llama_host,
            "--port", str(self.llama_port),
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

        self.process = subprocess.Popen(argv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        await self._wait_healthy()

    async def _wait_healthy(self):
        timeout = self.cfg["llama_server"].get("startup_timeout_seconds", 180)
        deadline = time.time() + timeout
        async with httpx.AsyncClient() as client:
            while time.time() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError(f"llama-server exited early (code {self.process.returncode})")
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
    global manager
    manager = ModelManager(CONFIG)
    reaper = asyncio.create_task(manager.start_idle_reaper())
    yield
    reaper.cancel()
    manager.shutdown()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "loaded_model": manager.current_model_name if manager else None}


@app.get("/v1/models", dependencies=[Depends(check_api_key)])
async def list_models():
    return {
        "object": "list",
        "data": [{"id": m["name"], "object": "model", "aliases": m.get("aliases", [])} for m in CONFIG["models"]],
    }


@app.post("/v1/chat/completions", dependencies=[Depends(check_api_key)])
async def chat_completions(request: Request):
    body = await request.json()
    model_cfg = resolve_model(body.get("model"))

    if _contains_image(body) and not model_cfg.get("vision"):
        raise HTTPException(400, f"Model '{model_cfg['name']}' does not support image input.")

    body["model"] = model_cfg["name"]  # normalize alias -> real name before forwarding

    await manager.acquire(model_cfg)
    try:
        timeout = CONFIG["server"].get("request_timeout_seconds", 300)
        client = httpx.AsyncClient(base_url=manager.base_url, timeout=timeout)
        if body.get("stream"):
            return await _proxy_stream(client, body)
        r = await client.post("/v1/chat/completions", json=body)
        await client.aclose()
        return JSONResponse(r.json(), status_code=r.status_code)
    finally:
        await manager.release()


async def _proxy_stream(client: httpx.AsyncClient, body: dict) -> StreamingResponse:
    async def gen():
        try:
            async with client.stream("POST", "/v1/chat/completions", json=body) as r:
                async for chunk in r.aiter_bytes():
                    yield chunk
        finally:
            await client.aclose()
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
