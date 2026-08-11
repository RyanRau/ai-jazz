# Mono

A framework for launching small web apps fast. Each app gets a
`*.ryanzrau.dev` subdomain, HTTPS, and automatic deployment to a single
DigitalOcean droplet — with no per-app infrastructure work.

Add an app to `deploy.yml`, push to `main`, and it's live.

## Structure

```
apps/
  ryanzrau/            # Personal site               → ryanzrau.dev
  pocketbase/          # Shared backend (auth + data) → api.ryanzrau.dev
packages/
  bluestar/            # React component library     → ui.ryanzrau.dev (Storybook)
  PACKAGES.md          # Component + prop reference
infra/
  generate-compose.py  # deploy.yml → docker-compose.yml
  validate_deploy.py   # config checks, run in CI
  new_app.py           # scaffolds a new app
  templates/app/       # the app template it renders
  README.md            # droplet setup and operations
  AUDIT.md             # architecture assessment and known trade-offs
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

Repo-wide checks (all run in PR validation):

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
| `rate_limit`          | No       | `{average, burst}` requests/sec per IP (default 100/50)                |
| `reserved_subdomains` | —        | Top-level list of subdomains owned by apps deployed from other repos   |

Adding a build arg is one step: list it under `build_args` and add a GitHub
secret **of the same name**. The workflows resolve them by name — no workflow
edit. Test deploys prefer a `TEST_<NAME>` secret when one exists.

Runtime env vars need their values in `/opt/apps/.env` on the droplet
(`chown deploy:deploy`, `chmod 600`).

## Deployment

Pushing to `main` runs the **Build and Deploy** workflow: it validates
`deploy.yml`, builds the apps affected by the push (any change under
`packages/`, `infra/`, `deploy.yml`, or the workflows rebuilds everything),
pushes images to GHCR, regenerates `docker-compose.yml` on the droplet, brings
containers up, and fails the run if anything doesn't reach a healthy state.

Traefik terminates TLS with auto-provisioned Let's Encrypt certificates and
routes by `Host()`, so a wildcard `*.ryanzrau.dev` DNS record means new
subdomains need no DNS or certificate work.

Droplet setup, backups, and debugging live in [`infra/README.md`](infra/README.md).

## Test deployments

Preview a branch on a real URL without touching production.

1. Add `test-deploy.yml` to the branch:

   ```yaml
   app: bluestar # or: apps: [pocketbase, ryanzrau]
   ```

2. **Actions → Test Deploy → Run workflow**, selecting the branch.
3. The app appears at its test subdomain: root-domain apps at
   `test.ryanzrau.dev`, others at `test-<subdomain>.ryanzrau.dev`.
4. Re-run the workflow to push updates; merging the PR cleans the test
   deployment up automatically.

Test containers get no volumes, so a test PocketBase starts with an empty,
throwaway database and cannot touch production data.

## Conventions

- App directories `snake_case`; subdomains `kebab-case`
- Each app owns its `Dockerfile` and `nginx.conf`; static sites use a two-stage
  build (`node:20-alpine` → `nginx:alpine`)
- No shared build tooling — apps build independently in Docker
- Images: `ghcr.io/ryanrau/mono/<app>:latest` (prod), `:test` (test deploys)
- Documentation lives next to what it documents

## External app deployments

Apps in other repos can take an unused `*.ryanzrau.dev` subdomain by joining the
shared Traefik network (`traefik_web`) as their own Compose project under
`/opt/external/<app>/` on the droplet. They're invisible to this repo's deploy
lifecycle — `--remove-orphans` is project-scoped, so mono deploys never touch
them. Record the subdomain under `reserved_subdomains` in `deploy.yml` so config
validation rejects a collision. Details in [`CLAUDE.md`](CLAUDE.md).
