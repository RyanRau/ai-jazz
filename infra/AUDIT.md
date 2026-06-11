# Monorepo & Deployment Audit (June 2026)

Assessment of the monorepo + subdomain deployment pattern: **sound for a personal, single-droplet setup.** The config-driven approach scales comfortably to ~10 apps at minimal cost. The notes below record what's working, what changed during the backend migration, and what's consciously deferred.

## Strengths

- **Config-driven control plane** — `deploy.yml` is a single source of truth; toggling `enabled` deploys or removes an app. The hand-rolled `generate-compose.py` is small, inspectable, and avoids heavyweight orchestration.
- **Traefik + Let's Encrypt automation** — wildcard DNS + per-container labels means new subdomains need zero DNS/TLS work; security headers applied uniformly.
- **Test subdomain deployments** — feature branches preview on real URLs (`test-*.ryanzrau.dev`) without touching prod, with automatic cleanup on merge.
- **External app isolation** — separate compose projects on the shared `traefik_web` network can't be touched by mono deploys (`--remove-orphans` is project-scoped).
- **Multi-stage Dockerfiles** — small runtime images, build/runtime separation, clear split between build args (baked) and runtime env (injected).

## Changes from the backend migration (June 2026)

- **Vendor dependency removed** — auth + data moved off nHost (deprecated v3 SDKs) to a **self-hosted PocketBase** (`apps/pocketbase`) at `api.ryanzrau.dev`: auth, collections, admin UI, and custom routes in one binary on embedded SQLite.
- **App-level volumes + healthchecks** — `generate-compose.py` now supports per-app `volumes` (named volumes auto-registered) and `healthcheck`; PocketBase persists to the `pb_data` volume and has a `/api/health` healthcheck.
- **Backups** — PocketBase's built-in scheduled backups (admin UI), optionally to Spaces, plus an optional volume-tar cron documented in `infra/README.md`.
- **Removed** — gallery + gallery_api apps, and the short-lived custom Hono API / Postgres / api-client experiment that PocketBase replaced.

## Known weaknesses (accepted for now)

| Issue                                                                                           | Impact                                        | Mitigation if it starts to hurt                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **No change detection** — every push to main rebuilds all enabled apps                          | Slow CI (~minutes per app), wasted bandwidth  | Compare `git diff` paths per app, or `dorny/paths-filter`; skip unchanged apps                                                   |
| **Hardcoded secret case statements** — each new build arg needs edits in two workflows          | Easy to forget; config drift                  | Name GitHub secrets identically to build args and resolve dynamically via `secrets[format(...)]` or a single JSON secret map     |
| **No rollback / deploy verification** — `compose up -d` succeeds even if an app crashes on boot | Bad deploy stays live until noticed           | Healthcheck-gated deploy step (poll `docker inspect` health after up; `docker compose rollback` is manual: retag previous image) |
| **Single droplet** — one machine is a SPOF for every app                                        | Total outage on droplet failure               | Acceptable for personal apps; backups + IaC-ish setup docs make rebuild ~1hr. Multi-node is not worth the cost/complexity yet    |
| **Secrets via SSH env + dotenv** — `/opt/apps/.env` is plaintext on the droplet                 | Compromise of droplet = all secrets           | chmod 600 + deploy-user-only access; a secrets manager is overkill at this scale                                                 |
| **No monitoring/alerting** — failures discovered by visiting the site                           | Silent downtime                               | Cheap first step: external uptime ping (UptimeRobot/healthchecks.io) against `/api/health`                                       |
| **Single SQLite instance for the backend** — PocketBase is one container on one disk            | Backend down = all apps lose data access      | Acceptable at this scale; rely on PocketBase scheduled backups + the volume. SQLite is plenty for personal traffic               |
| **Pre-1.0 backend** — PocketBase (v0.x) has occasional breaking changes between minor versions  | Upgrades may need migration tweaks            | Version is pinned in the Dockerfile (`PB_VERSION`); read release notes before bumping; backups before upgrade                    |
| **One test deployment at a time** — single `test-deploy.active.yml` on the droplet              | Two branches can't test-deploy simultaneously | Rarely matters for a single developer                                                                                            |

## Deliberately not done

- **Turborepo/Nx** — apps build independently in Docker; a build graph adds tooling for little gain at this size.
- **Kubernetes / managed PaaS** — compose on a droplet is dramatically simpler and cheaper for this workload.
- **Blue-green deploys** — seconds of restart downtime per deploy is acceptable for personal apps.
