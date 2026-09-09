# home-server

Tools that run on hardware at home, not on the droplet. This directory is
version-controlled here for one repo and shared conventions — it is not part
of the `apps/` deploy pipeline described in the root README:

- Nothing under `home-server/` is built into a Docker image, listed in
  `deploy.yml`, or routed by Traefik. `infra/generate-compose.py`,
  `infra/validate_deploy.py`, and `infra/select_apps.py` don't know it exists.
- Each tool runs on its own home machine, started however that machine starts
  long-running processes (systemd unit, login item, etc.) — not via
  `docker compose` on the droplet.
- Each tool documents itself in its own subdirectory README, same as an app
  under `apps/`.

## Tools

| Directory                              | What                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------- |
| [`llm-gateway`](llm-gateway/README.md) | Auth + on-demand model swap + concurrency cap in front of llama-server |
