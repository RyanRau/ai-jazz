# Mono

A framework for launching small web apps fast. Each app gets a
`*.ryanzrau.dev` subdomain, HTTPS, and automatic deployment to a single
DigitalOcean droplet — with no per-app infrastructure work.

Add an app to `deploy.yml`, push to `main`, and it's live.

## Structure

```
apps/
  ryanzrau/            # Personal site → ryanzrau.dev; signed-in sidebar adds
                       # the app catalog, admin console, and settings page
  stash/               # Household inventory with sharing → stash.ryanzrau.dev
  tony/                # LLM dashboard (home-lab)     → tony.ryanzrau.dev
  pocketbase/          # Shared backend (auth + data) → api.ryanzrau.dev
packages/
  bluestar/            # React component library     → ui.ryanzrau.dev (Storybook)
  PACKAGES.md          # Component + prop reference
home-server/
  llm-gateway/          # Auth + on-demand model swap in front of llama-server
  README.md              # What this directory is and isn't
infra/
  generate-compose.py   # deploy.yml → docker-compose.yml (production or test)
  validate_deploy.py    # config checks, first step of every deploy
  select_apps.py        # which apps a change set affects
  new_app.py            # scaffolds a new app
  retire_test_apps.sh   # removes the test project from the droplet
  templates/app/        # the app template new_app.py renders
  README.md             # droplet setup and operations
  AUDIT.md              # architecture assessment and known trade-offs
deploy.yml             # source of truth: which apps are live, and where
```

Each app and package documents itself in its own README. This file covers the
framework around them.

## The stack

Every new app uses the same three things. The point is that an app is _only_ its
own logic — everything else is already solved.

| Layer      | What                                    | Why                                                            |
| ---------- | --------------------------------------- | -------------------------------------------------------------- |
| Frontend   | React + TypeScript + Vite               | Static build, served by nginx; nothing to run server-side      |
| UI         | [`bluestar`](packages/PACKAGES.md)      | Themed components — apps don't write CSS or one-off primitives |
| Backend    | [PocketBase](apps/pocketbase/README.md) | One shared instance: auth, collections, files, custom routes   |
| Deployment | `deploy.yml` + Traefik + GitHub Actions | Subdomain, TLS, and CI come free with the config entry         |

Missing a component? Add it to bluestar. Need data? Add a collection to
PocketBase. Neither is a reason to start a new stack.

## home-server/

Tools that run on physical hardware at home rather than the droplet —
currently [`llm-gateway`](home-server/llm-gateway/README.md), a reverse proxy
in front of a local `llama-server`. This directory is **not** part of the
`apps/` deploy pipeline: nothing in it is built into a Docker image, listed in
`deploy.yml`, or routed by Traefik. It lives here for one repo, one set of
conventions, and shared history — each tool still runs on its own machine,
started however that machine starts long-running processes (systemd, a login
item, etc.), and is documented in its own subdirectory README. See
[`home-server/README.md`](home-server/README.md) for the ground rules.

## Creating an app

```bash
python3 infra/new_app.py recipe_box --title "Recipe Box"
```

That scaffolds `apps/recipe_box/` from `infra/templates/app` — Vite config,
`Dockerfile`, `nginx.conf`, a bluestar-wired `App.tsx`, a PocketBase client at
`src/pb.ts`, and a README — installs dependencies, and registers the app in
`deploy.yml` at `recipe-box.ryanzrau.dev`.

Then:

```bash
cd apps/recipe_box && npm run dev     # build the thing
python3 infra/validate_deploy.py      # check the config
git add . && git commit && git push   # merge to main → live
```

Options: `--subdomain` (defaults to the app name with dashes; `""` for the root
domain), `--port`, `--disabled` to register without deploying, `--no-install`.

Doing it by hand instead: create `apps/<name>/` with a `Dockerfile` and
`nginx.conf`, then add the app to `deploy.yml`. App directories are `snake_case`;
subdomains are `kebab-case`.

## Local development

```bash
npm install              # repo-root tooling (eslint, prettier)
npm run bootstrap        # build bluestar — required once per clone
cd apps/<name> && npm install && npm run dev
```

`npm run bootstrap` is not optional on a fresh clone: apps depend on bluestar
through a `file:` reference and import its built `dist/`, and npm will not
install bluestar's own build tooling on their behalf.

Repo-wide checks. There is no PR gate — run these before you push:

```bash
npm run lint             # eslint across apps/ and packages/
npm run format:check     # prettier
npm run validate         # deploy.yml invariants
ruff check . && ruff format --check .   # infra/ python
```

## deploy.yml

The control plane. `enabled: true` puts an app online; `false` takes it offline.

```yaml
apps:
  recipe_box:
    subdomain: "recipe-box" # → recipe-box.ryanzrau.dev ("" for the root domain)
    enabled: true
    port: 80
```

| Field                 | Required | Description                                                            |
| --------------------- | -------- | ---------------------------------------------------------------------- |
| `subdomain`           | Yes      | Subdomain for routing (`""` for the root domain)                       |
| `enabled`             | Yes      | `true` to deploy, `false` to take offline                              |
| `port`                | Yes      | Container port (usually `80`)                                          |
| `path`                | No       | Build context path (defaults to `apps/<name>`)                         |
| `build_args`          | No       | Docker build arg names, resolved from same-named GitHub secrets        |
| `environment`         | No       | Runtime env vars (`${VAR}` reads from `/opt/apps/.env` on the droplet) |
| `volumes`             | No       | `name:/path` mounts; named volumes are auto-registered                 |
| `depends_on`          | No       | Internal service → compose condition (e.g. `redis: service_healthy`)   |
| `healthcheck`         | No       | Compose healthcheck passthrough                                        |
| `frame_options`       | No       | `X-Frame-Options` value (default `SAMEORIGIN`)                         |
| `development`         | No       | `true` moves the app to the test target at `test-<subdomain>`          |
| `rate_limit`          | No       | `{average, burst}` requests/sec per IP (default 100/50)                |
| `reserved_subdomains` | —        | Top-level list of subdomains owned by apps deployed from other repos   |

Adding a build arg is one step: list it under `build_args` and add a GitHub
secret **of the same name**. The deploy resolves them by name — no workflow
edit.

Runtime env vars need their values in `/opt/apps/.env` on the droplet
(`chown deploy:deploy`, `chmod 600`).

## Deployment

Pushing to `main` runs the **Build and Deploy** workflow against the production
target: it validates `deploy.yml`, builds the affected apps (any change under
`packages/`, `infra/`, `deploy.yml`, or the workflow rebuilds everything), pushes
images to GHCR, regenerates `docker-compose.yml` on the droplet, brings containers
up, and fails the run if anything doesn't reach a healthy state.

The same workflow has a **test** target for apps still in development — see
below. A config or build failure stops a run before the droplet is touched.

Traefik terminates TLS with auto-provisioned Let's Encrypt certificates and
routes by `Host()`, so a wildcard `*.ryanzrau.dev` DNS record means new
subdomains need no DNS or certificate work.

Droplet setup, backups, and debugging live in [`infra/README.md`](infra/README.md).

## Apps still in development

An app that isn't ready to claim its real URL gets `development: true`:

```yaml
apps:
  recipe_box:
    subdomain: "recipe-box"
    enabled: true
    development: true # → test-recipe-box.ryanzrau.dev
    port: 80
```

That moves it out of the production deploy entirely and into the **test target**,
which you run by hand against any branch:

**Actions → Build and Deploy → Run workflow** → pick the branch → `target: test`

It goes live at `test-recipe-box.ryanzrau.dev`, built from that branch. Push to
the branch and re-run to update it. Production is untouched throughout — the two
targets deploy separate Docker Compose projects, so neither can stop or remove
the other's containers, and a test app gets its own empty volumes rather than
production's data.

When it's ready, delete the `development` line: the app joins the production
deploy at `recipe-box.ryanzrau.dev` on the next push to `main`.

**Any push to `main` retires the running test apps**, so that once main has
shipped nothing is left on a `test-*` subdomain. That includes pushes unrelated
to what you're testing — re-run the test target to bring it back up. A _failed_
production deploy leaves the test apps alone.

Root-domain apps (`subdomain: ""`) land at `test.ryanzrau.dev`. Scaffold straight
into this mode with `python3 infra/new_app.py <name> --development`.

The `test-` namespace is _derived_ from the flag — validation rejects a
hand-written `test-*` subdomain, so two apps can never reach the same URL by two
different routes. A development app and a production app may share a `subdomain`
value, so you can run the new version at `test-recipe-box` while the old one
keeps serving `recipe-box`.

## Conventions

- App directories `snake_case`; subdomains `kebab-case`
- Each app owns its `Dockerfile` and `nginx.conf`; static sites use a two-stage
  build (`node:20-alpine` → `nginx:alpine`)
- No shared build tooling — apps build independently in Docker
- Images: `ghcr.io/ryanrau/mono/<app>:latest`
- Documentation lives next to what it documents

## External app deployments

Apps in other repos can take an unused `*.ryanzrau.dev` subdomain by joining the
shared Traefik network (`traefik_web`) as their own Compose project under
`/opt/external/<app>/` on the droplet. They're invisible to this repo's deploy
lifecycle — `--remove-orphans` is project-scoped, so mono deploys never touch
them. Record the subdomain under `reserved_subdomains` in `deploy.yml` so config
validation rejects a collision. Details in [`CLAUDE.md`](CLAUDE.md).
