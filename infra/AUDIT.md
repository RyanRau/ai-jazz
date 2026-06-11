# Monorepo & Deployment Audit (June 2026)

Assessment of the monorepo + subdomain deployment pattern: **sound for a personal, single-droplet setup.** The config-driven approach scales comfortably to ~10 apps at minimal cost. The notes below record what's working, what was fixed during the API platform work, and what's consciously deferred.

## Strengths

- **Config-driven control plane** — `deploy.yml` is a single source of truth; toggling `enabled` deploys or removes an app. The hand-rolled `generate-compose.py` is small, inspectable, and avoids heavyweight orchestration.
- **Traefik + Let's Encrypt automation** — wildcard DNS + per-container labels means new subdomains need zero DNS/TLS work; security headers applied uniformly.
- **Test subdomain deployments** — feature branches preview on real URLs (`test-*.ryanzrau.dev`) without touching prod, with automatic cleanup on merge.
- **External app isolation** — separate compose projects on the shared `traefik_web` network can't be touched by mono deploys (`--remove-orphans` is project-scoped).
- **Multi-stage Dockerfiles** — small runtime images, build/runtime separation, clear split between build args (baked) and runtime env (injected).

## Fixed during the API platform work

- **Container healthchecks** — postgres (`pg_isready`) and the api (`/health` via wget) now have healthchecks; the api waits on `postgres: service_healthy` via `depends_on`.
- **Internal services support** — databases no longer need to be hosted externally (nHost) or hand-managed; `services:` in `deploy.yml` keeps them un-routed and internal.
- **Database backups** — nightly `pg_dump` cron with 7-day rotation documented in `infra/README.md` (must be installed on the droplet manually).
- **Vendor dependency removed** — auth + data moved from nHost (deprecated v3 SDKs) to the self-hosted api.

## Known weaknesses (accepted for now)

| Issue                                                                                           | Impact                                            | Mitigation if it starts to hurt                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No change detection** — every push to main rebuilds all enabled apps                          | Slow CI (~minutes per app), wasted bandwidth      | Compare `git diff` paths per app, or `dorny/paths-filter`; skip unchanged apps                                                                                          |
| **Hardcoded secret case statements** — each new build arg needs edits in two workflows          | Easy to forget; config drift                      | Name GitHub secrets identically to build args and resolve dynamically via `secrets[format(...)]` or a single JSON secret map                                            |
| **No rollback / deploy verification** — `compose up -d` succeeds even if an app crashes on boot | Bad deploy stays live until noticed               | Healthcheck-gated deploy step (poll `docker inspect` health after up; `docker compose rollback` is manual: retag previous image)                                        |
| **Single droplet** — one machine is a SPOF for every app                                        | Total outage on droplet failure                   | Acceptable for personal apps; backups + IaC-ish setup docs make rebuild ~1hr. Multi-node is not worth the cost/complexity yet                                           |
| **Secrets via SSH env + dotenv** — `/opt/apps/.env` is plaintext on the droplet                 | Compromise of droplet = all secrets               | chmod 600 + deploy-user-only access; a secrets manager is overkill at this scale                                                                                        |
| **No monitoring/alerting** — failures discovered by visiting the site                           | Silent downtime                                   | Cheap first step: external uptime ping (UptimeRobot/healthchecks.io) against `/health` endpoints                                                                        |
| **Test deploys share the prod database** — `api-test` inherits prod `environment`               | A test api runs real migrations against prod data | Documented constraint: migrations are forward-only/idempotent; don't test destructive migrations via test deploys. Split a `mono_test` database if this becomes routine |
| **One test deployment at a time** — single `test-deploy.active.yml` on the droplet              | Two branches can't test-deploy simultaneously     | Rarely matters for a single developer                                                                                                                                   |

## Deliberately not done

- **Turborepo/Nx** — apps build independently in Docker; a build graph adds tooling for little gain at this size.
- **Kubernetes / managed PaaS** — compose on a droplet is dramatically simpler and cheaper for this workload.
- **Blue-green deploys** — seconds of restart downtime per deploy is acceptable for personal apps.
