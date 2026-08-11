# Mono Repo

Personal monorepo for small web apps deployed to `ryanzrau.dev` via Docker +
Traefik on a DigitalOcean droplet. Optimized for one thing: getting a new
lightweight app from idea to live URL quickly, with no per-app infrastructure
work.

## Repo Structure

```
apps/              # Deployable apps (Dockerfile + nginx.conf per app)
  ryanzrau/        # Personal site → ryanzrau.dev
  pocketbase/      # Shared backend: auth + data + admin UI → api.ryanzrau.dev
packages/
  bluestar/        # React component library (also deployed as Storybook → ui.ryanzrau.dev)
  PACKAGES.md      # Component + prop reference — read before writing UI
infra/             # generate-compose.py, validate_deploy.py, new_app.py, templates/, README, AUDIT
deploy.yml         # Source of truth for which apps are deployed and their subdomains
```

Each app and package has its own README covering how to run and change it. There
is no top-level `docs/` directory — documentation lives next to what it
documents.

## The house stack (non-negotiable defaults)

New apps use all three of these. Deviating means maintaining new infrastructure,
which defeats the purpose of the repo.

1. **React + TypeScript + Vite**, built to static files and served by nginx.
2. **`bluestar`** for all UI. Consume it via `"bluestar": "file:../../packages/bluestar"`.
   If a component is missing, **add it to bluestar** — do not write a one-off
   component inside an app. See `packages/PACKAGES.md` for the real prop APIs
   (they are theme-driven and differ from typical component libraries: `Text`
   takes a `variant`, spacing is a numeric union, buttons take `isDisabled`).
3. **PocketBase** (`apps/pocketbase`) for auth, data, and file storage. One
   shared instance for every app; a new app gets a collection, not a new
   database. See `apps/pocketbase/README.md`.

## Creating a new app

Use the scaffolder — it produces a correct, deployable app and registers it:

```bash
python3 infra/new_app.py recipe_box --title "Recipe Box"
```

This creates `apps/recipe_box/` from `infra/templates/app` (Vite + TS config,
`Dockerfile`, `nginx.conf`, bluestar-wired `App.tsx`, PocketBase client at
`src/pb.ts`, `README.md`), runs `npm install`, and adds the app to `deploy.yml`
at `recipe-box.ryanzrau.dev`. Flags: `--subdomain` (`""` for the root domain),
`--port`, `--disabled`, `--no-install`.

Then build the app, run `python3 infra/validate_deploy.py`, commit (including
`package-lock.json`), and merge to `main` — CI deploys it.

Changing the template itself changes every future app: edit
`infra/templates/app/*.tpl` (the `.tpl` suffix keeps placeholders away from
eslint/prettier/tsc; the scaffolder strips it).

Conventions: app directories are `snake_case` (`recipe_box`), subdomains are
`kebab-case` (`recipe-box`).

## Local development

```bash
npm install          # repo-root tooling
npm run bootstrap    # build bluestar — REQUIRED once per clone
cd apps/<name> && npm install && npm run dev
```

`npm install` inside an app runs bluestar's `prepare` (tsup build) but does not
install bluestar's devDependencies, so bluestar must be installed first. After
changing bluestar, rebuild it — apps import `dist/`, not `src/`.

Checks, all enforced by PR validation:

```bash
npm run lint && npm run format:check    # eslint + prettier across apps/ and packages/
npm run validate                        # deploy.yml invariants
ruff check . && ruff format --check .   # infra/ python
```

## Deployment

Config-driven via `deploy.yml`. The **Build and Deploy** workflow validates the
config, builds the apps affected by the push, pushes images to GHCR, regenerates
`docker-compose.yml` on the droplet, and verifies containers come up healthy.

- `deploy.yml` — which apps are live, their subdomains and ports
- `infra/generate-compose.py` — renders `docker-compose.yml` (plus an optional
  test overlay from `test-deploy.active.yml`)
- `infra/validate_deploy.py` — catches duplicate subdomains, missing Dockerfiles,
  reserved-subdomain collisions, malformed fields
- Traefik routes by `Host()` and provisions Let's Encrypt TLS automatically
- Wildcard DNS (`*.ryanzrau.dev`) means new subdomains need no DNS work

Only apps whose files changed are rebuilt; a change under `packages/`, `infra/`,
`deploy.yml`, or `.github/workflows/` rebuilds everything. Run the workflow
manually with `build_all` to force a full rebuild.

### deploy.yml Config Reference

| Field           | Required | Description                                                          |
| --------------- | -------- | -------------------------------------------------------------------- |
| `subdomain`     | Yes      | Subdomain for routing (`""` for the root domain)                     |
| `enabled`       | Yes      | `true` to deploy, `false` to take offline                            |
| `port`          | Yes      | Container port (usually `80`)                                        |
| `path`          | No       | Custom build context path (defaults to `apps/<name>`)                |
| `build_args`    | No       | Docker build arg names, resolved from same-named GitHub secrets      |
| `environment`   | No       | Runtime env vars (`${VAR}` reads the droplet's `/opt/apps/.env`)     |
| `volumes`       | No       | `name:/path` mounts; named volumes are auto-registered               |
| `depends_on`    | No       | Internal service → compose condition (e.g. `redis: service_healthy`) |
| `healthcheck`   | No       | Compose healthcheck passthrough                                      |
| `frame_options` | No       | `X-Frame-Options` value (default `SAMEORIGIN`)                       |
| `rate_limit`    | No       | `{average, burst}` requests/sec per source IP (default 100/50)       |

Top-level `reserved_subdomains` lists subdomains owned by apps deployed from
other repos, so validation rejects a collision.

**Adding a build arg or secret:**

1. Add the arg name to the app's `build_args` in `deploy.yml`
2. Add a GitHub secret **with exactly that name**

The workflows resolve build args from secrets by name — no workflow edit needed.
Test deploys prefer `TEST_<NAME>` when that secret exists, otherwise fall back to
`<NAME>`.

**Adding a runtime env var:**

1. Add it to the app's `environment` map in `deploy.yml`
2. Set the value in `/opt/apps/.env` on the droplet (auto-loaded by docker
   compose; must be readable by `deploy` — `chown deploy:deploy`, `chmod 600`)

### Internal Services

A top-level `services:` section can declare internal containers (e.g. Redis) that
join the shared docker network but get no Traefik routing and no host ports. Apps
reach them by service name and gate startup with `depends_on`. Named volumes are
collected automatically. None are configured — PocketBase uses embedded SQLite.

### The Shared Backend (apps/pocketbase)

A single PocketBase binary at `api.ryanzrau.dev` providing auth, collections,
realtime, file storage, an admin UI at `/_/`, and custom routes, on embedded
SQLite persisted in the `pb_data` volume.

- **Schema** is version-controlled in `apps/pocketbase/pb_migrations/*.js` and
  applied automatically on start. Prefix collections with the owning app
  (`recipes_entries`). Migrations are append-only once deployed.
- **Custom logic** lives in `apps/pocketbase/pb_hooks/*.pb.js` — `routerAdd(...)`
  registers routes under `/api/custom/`. The goja runtime is not Node; keep hooks
  thin.
- **Auth**: signup is closed (the baseline migration sets `users.createRule` to
  `null`). Create accounts in the admin UI. Clients authenticate via
  `POST /api/collections/users/auth-with-password`. Give machine clients (n8n,
  scripts) a dedicated least-privilege user, never the superuser.
- **First-run setup** per fresh `pb_data` volume:
  `docker exec pocketbase /pb/pocketbase superuser upsert <email> <pass>`.

Full detail in `apps/pocketbase/README.md`.

## Test Subdomain Deployments

Any app (or several) can be deployed to test subdomains from a feature branch
without impacting production.

1. Add `test-deploy.yml` to the branch:

   ```yaml
   app: bluestar # or: apps: [pocketbase, ryanzrau]
   ```

   App names must match keys in `deploy.yml`.

2. **Actions → Test Deploy → Run workflow**, selecting the branch.
3. The app is live at its test subdomain. Re-run to update.
4. Merging the PR triggers **Test Cleanup**, which removes the deployment.

### Test subdomain naming

- Root domain app (`subdomain: ""`) → `test.ryanzrau.dev`
- Subdomain app (`"ui"`) → `test-ui.ryanzrau.dev`

### How test deploy works

1. Reads `test-deploy.yml` from the branch for the app list
2. Builds each app and pushes with the `:test` tag to GHCR
3. SCPs the branch's `deploy.yml` and `infra/generate-compose.py` to the droplet
4. Writes `test-deploy.active.yml` on the droplet with app metadata
5. Runs `generate-compose.py`, merging prod + test services into one compose file
6. Restores main's files via `git checkout`
7. Pulls test images, starts only the test services, and fails if one doesn't run

### Key details

- Multiple apps can be test-deployed simultaneously
- Test containers get **no volumes** — a test PocketBase is empty and ephemeral
- The workflow is manual (does not run on push)
- `test-deploy.yml` is the branch config (committed); `test-deploy.active.yml` is
  droplet runtime state (gitignored)
- A prod deploy to `main` removes any active test deployment

### Debugging test deploys

- **"App not found in deploy.yml"** — the app must exist in the branch's
  `deploy.yml` with a subdomain
- **Image not found** — test images use the `:test` tag, not `:latest`
- **Site not loading** — check `docker ps | grep test`, Traefik labels via
  `docker inspect`, and `dig test-<subdomain>.ryanzrau.dev`
- **Compose errors about missing services** — check `test-deploy.active.yml`

## Code Quality

ESLint + Prettier (JS/TS across `apps/` and `packages/`) and Ruff (Python in
`infra/`) are enforced by PR validation, which also validates `deploy.yml` and
builds every enabled app's image. The workflow auto-fixes lint/format issues and
commits them back to the PR.

## Security Expectations

- Never commit secrets. Build-time values come from GitHub secrets via
  `build_args`; runtime values from `/opt/apps/.env` on the droplet. Anything
  baked into a Vite build (`VITE_*`) is **public** — treat it as such.
- PocketBase collections must set explicit access rules. An empty-string rule
  (`""`) means fully public; unset means superuser-only. Default to
  `@request.auth.id != ""`.
- Traefik applies HSTS, `X-Frame-Options: SAMEORIGIN`, nosniff, referrer policy,
  and per-IP rate limiting to every routed app. Override per app in `deploy.yml`
  only with a reason.
- Keep signup closed on PocketBase; create accounts deliberately.

## External App Deployments

External repos can deploy apps to unused `*.ryanzrau.dev` subdomains by joining
the shared Traefik network (`traefik_web`). These apps run as separate Docker
Compose projects on the droplet under `/opt/external/<app-name>/` and are
invisible to the mono repo's deploy lifecycle.

The `web` network in `generate-compose.py` has a fixed name (`traefik_web`) so
external containers can reliably join it with `external: true`.

### Why this is safe

- `--remove-orphans` only affects containers in the same Compose project.
  External apps use a different project, so mono deploys never touch them.
- Traefik routes by `Host()` rule — no port conflicts, since containers don't
  bind host ports.
- When the mono repo redeploys and restarts Traefik, it re-discovers all labeled
  containers on `traefik_web`, including external ones.

### Setting up an external app

1. Add a two-stage `Dockerfile` (`node:20-alpine` → `nginx:alpine`) and an
   `nginx.conf` with SPA `try_files` support.
2. Add a `docker-compose.yml` joining the Traefik network as external:
   ```yaml
   networks:
     web:
       external: true
       name: traefik_web
   ```
   Include Traefik labels for routing (`Host(\`<subdomain>.ryanzrau.dev\`)`), TLS
(`certresolver=le`), and security headers.
3. On the droplet, create `/opt/external/<app-name>/` owned by `deploy` and place
   the `docker-compose.yml` there.
4. Set up a GitHub Actions workflow to build/push to GHCR, then SSH to the
   droplet and run `docker compose pull && docker compose up -d --force-recreate
--remove-orphans` in that directory.
5. Required GitHub secrets in the external repo: `DROPLET_IP`, `DROPLET_SSH_KEY`,
   `GHCR_TOKEN`.
6. **Add the subdomain to `reserved_subdomains` in `deploy.yml`** so monorepo
   config validation rejects a future collision.

### Reserved external subdomains

Tracked in `deploy.yml` under `reserved_subdomains` (currently: `drinkz`).
