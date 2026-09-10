# Mono Repo

Personal monorepo for small web apps deployed to `ryanzrau.dev` via Docker +
Traefik on a DigitalOcean droplet. Optimized for one thing: getting a new
lightweight app from idea to live URL quickly, with no per-app infrastructure
work.

## Repo Structure

```
apps/              # Deployable apps (Dockerfile + nginx.conf per app)
  ryanzrau/        # Personal site → ryanzrau.dev
  hub/             # Cross-app dashboard + shared settings page → hub.ryanzrau.dev
  stash/           # Household inventory with sharing → stash.ryanzrau.dev
  tony/            # LLM dashboard (home-lab) → tony.ryanzrau.dev
  pocketbase/      # Shared backend: auth + data + admin UI → api.ryanzrau.dev
packages/
  bluestar/        # React component library (also deployed as Storybook → ui.ryanzrau.dev)
  PACKAGES.md      # Component + prop reference — read before writing UI
home-server/       # Tools that run on home hardware, NOT the deploy pipeline
  llm-gateway/     # Auth + on-demand model swap in front of llama-server
infra/             # deploy tooling: generate-compose, validate_deploy, select_apps,
                   # new_app, retire_test_apps, templates/, README, AUDIT
deploy.yml         # Source of truth for which apps are deployed and their subdomains
```

Each app and package has its own README covering how to run and change it. There
is no top-level `docs/` directory — documentation lives next to what it
documents.

`home-server/` is a separate category from `apps/`: nothing in it is a Docker
image, listed in `deploy.yml`, or routed by Traefik — it's source for tools
that run on physical hardware at home, kept in this repo for one set of
conventions and shared history. See `home-server/README.md`.

## The house stack (non-negotiable defaults)

New apps use all three of these. Deviating means maintaining new infrastructure,
which defeats the purpose of the repo.

1. **React + TypeScript + Vite**, built to static files and served by nginx.
2. **`bluestar`** for all UI. Consume it via `"bluestar": "file:../../packages/bluestar"`.
   **bluestar owns every common/core UI primitive** — buttons, inputs, cards,
   badges, selectable list rows, toggles, dialogs, and so on. An app's own
   `src/` should only ever hold genuinely app-specific _composition_
   (business logic, data wiring, a page layout built from bluestar pieces),
   never a hand-rolled visual primitive. If a component is missing, **add it
   to bluestar** — do not write a one-off inside an app, and do not
   re-implement the same small piece (a list row, a segmented toggle) in two
   places in the same app instead of lifting it out. Before building
   something that looks like a button/card/list/dialog/etc. from raw
   `<div>`/`<button>` and inline styles or a local `css` call, check
   `packages/PACKAGES.md` for an existing component first — a hand-rolled
   equivalent existing already is the most common way this rule gets broken.
   See `packages/PACKAGES.md` for the real prop APIs (they are theme-driven
   and differ from typical component libraries: `Text` takes a `variant`,
   spacing is a numeric pixel union, buttons take `isDisabled` and `variant`
   — `type` is the native HTML attribute). Forms use `useForm` + `field(name)`
   rather than a `useState` per field, and the theme ships dark mode via
   `colorScheme` / `useColorScheme`.
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

Checks. Nothing runs them on a PR — run them before pushing:

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
- `infra/generate-compose.py` — renders `docker-compose.yml`
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
| `development`   | No       | `true` moves the app to the test target at `test-<subdomain>`        |
| `frame_options` | No       | `X-Frame-Options` value (default `SAMEORIGIN`)                       |
| `rate_limit`    | No       | `{average, burst}` requests/sec per source IP (default 100/50)       |

Top-level `reserved_subdomains` lists subdomains owned by apps deployed from
other repos, so validation rejects a collision.

**Adding a build arg or secret:**

1. Add the arg name to the app's `build_args` in `deploy.yml`
2. Add a GitHub secret **with exactly that name**

The deploy resolves build args from secrets by name — no workflow edit needed.

**Adding a runtime env var:**

1. Add it to the app's `environment` map in `deploy.yml` as `NAME: "${NAME}"`
2. Add a GitHub secret **with exactly that name**

A production deploy (a push to `main`) resolves every referenced name from a
same-named secret — same convention as `build_args` — and writes them into a
fresh `/opt/apps/.env` on the droplet, `chmod 600`. No SSH, no workflow edit.
A missing secret just leaves that var empty rather than failing the deploy,
since these vars are meant to be optional. Test deploys don't touch
`/opt/apps/.env` — it's one droplet-wide file production also depends on, so
only `main` writes it.

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

## Apps Still In Development

One workflow, two targets, decided by `development: true` in `deploy.yml`:

| Target         | Trigger                              | Deploys                                                               |
| -------------- | ------------------------------------ | --------------------------------------------------------------------- |
| **production** | Push to `main` / manual on `main`    | Apps **without** the flag → real subdomains, `:latest`                |
| **test**       | Manual, any branch (**the default**) | Apps **with** the flag → `test-<subdomain>`, `:test` from that branch |

A manual run defaults to `target: test`, and a manual `target: production` is
**rejected from any branch but `main`**. The droplet renders `docker-compose.yml`
from main's `deploy.yml` (it git-pulls main) while images come from the dispatched
ref, so a production run off a branch would wire branch-built `:latest` images
into main's config. The run's title in the Actions list shows the resolved target
and ref, so a mis-picked dropdown is visible without opening the run.

```yaml
recipe_box:
  subdomain: "recipe-box"
  enabled: true
  development: true # → test-recipe-box.ryanzrau.dev, via the test target
  port: 80
```

Run the test target from **Actions → Build and Deploy → Run workflow**, selecting
the branch and setting `target: test`.

- **They cannot clobber each other.** The targets deploy separate Compose
  projects (`apps` and `mono-test`), and `--remove-orphans` is project-scoped, so
  a production deploy never sees a test container or vice versa. The app sets are
  disjoint by construction, container names differ by a `-test` suffix, image tags
  differ, and named volumes are project-prefixed — a test PocketBase gets its own
  empty volume, not production's data.
- The test compose file is rendered in CI from the branch's `deploy.yml` and
  copied over as one artifact; the droplet's checkout stays on `main`.
- The test project joins the Traefik network as `external`, so production must
  have been deployed at least once first.
- **A production deploy retires the test apps.** Every production run ends by
  tearing the `mono-test` project down, so once `main` has shipped nothing is
  serving a `test-*` subdomain — including on an unrelated or docs-only push.
  Re-run the test target to bring it back. A _failed_ production deploy skips the
  teardown and leaves the test environment intact.
- **Promoting is deleting one line.** The app joins the production deploy on the
  next push to `main`, which also retires its old test container. To retire test
  apps without a production deploy, run the test target with nothing marked, or
  `bash infra/retire_test_apps.sh` on the droplet.
- Root-domain apps (`subdomain: ""`) become `test.ryanzrau.dev`.
- The `test-` namespace is derived from the flag. Validation rejects a
  hand-written `test-*` subdomain so a URL can't be reachable two ways.
- A development app and a production app may share a `subdomain` value, so a new
  version can run at `test-recipe-box` while the old one serves `recipe-box`.
- **Never flip `development: true` on an app's existing key to test a rework of
  something already live** — that moves it out of the production app set, and
  the next production deploy tears its container down the moment the change
  reaches `main`. Add a **second** entry instead: a new key with the same
  `path` and `subdomain`, flagged `development: true`. The original key keeps
  serving production untouched at its subdomain while the new key builds and
  tests at `test-<subdomain>`; promote later by deleting the old key and
  dropping the flag from the new one. `infra/check_demotions.py` runs on every
  production deploy triggered by a push (not a manual dispatch) and fails the
  run if a currently-live app would be silently demoted this way.

Scaffold directly into this mode: `python3 infra/new_app.py <name> --development`.

## Code Quality

ESLint + Prettier (JS/TS across `apps/` and `packages/`) and Ruff (Python in
`infra/`) are **not enforced by CI** — there is no PR gate. Run them locally
before pushing.

The deploy does gate on the two things that would actually break the site: it
validates `deploy.yml` and builds each affected app's image, both before the
droplet is touched.

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
