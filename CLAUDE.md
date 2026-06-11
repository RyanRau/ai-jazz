# Mono Repo

Personal monorepo for web apps deployed to `ryanzrau.dev` via Docker + Traefik on a Digital Ocean droplet.

## Repo Structure

```
apps/              # Web app deployment artifacts (Dockerfile + nginx.conf per app)
  ryanzrau/       # Portfolio site → ryanzrau.dev
  bluestar/       # Storybook static site → ui.ryanzrau.dev
  wally/          # Wally app (preferred Walmart products) → wally.ryanzrau.dev
  api/            # Shared backend API (auth + per-app modules) → api.ryanzrau.dev
  be_mine/        # Valentine card app (not currently deployed)
packages/         # Shared packages
  bluestar/       # React component library source (used by apps/ryanzrau)
  api-client/     # Auth/session + fetch client for apps/api (used by apps/wally)
infra/            # Deployment tooling (generate-compose.py, README)
deploy.yml        # Source of truth for which apps are deployed and their subdomains
```

## Deployment

All deployment is config-driven via `deploy.yml` at the repo root. The CI pipeline (`deploy.yml` workflow) builds Docker images, pushes to GHCR, and deploys via SSH.

- `deploy.yml` — Controls which apps are live, their subdomains, and ports
- `infra/generate-compose.py` — Reads `deploy.yml` (and optionally `test-deploy.active.yml`) to generate `docker-compose.yml`
- Traefik handles subdomain routing and auto-provisions Let's Encrypt TLS
- Wildcard DNS (`*.ryanzrau.dev`) routes all subdomains to the droplet

### Adding a New App

1. Create `apps/<app_name>/` with a `Dockerfile` and (for static sites) an `nginx.conf`
2. Add the app to `deploy.yml`:
   ```yaml
   apps:
     new_app:
       subdomain: "my-app" # → my-app.ryanzrau.dev (use "" for root domain)
       enabled: true
       port: 80
       # Optional: build args resolved from GitHub secrets at build time
       build_args:
         - VITE_API_URL
       # Optional: runtime env vars (for Node.js APIs, not baked into image)
       environment:
         SECRET_KEY: "${SECRET_KEY}"
       # Optional: wait for an internal service (compose condition)
       depends_on:
         postgres: service_healthy
       # Optional: container healthcheck (compose passthrough)
       healthcheck:
         test: ["CMD-SHELL", "wget -qO- http://localhost:80/health || exit 1"]
   ```
3. Push to `main` — the CI workflow builds **all** enabled apps and deploys automatically (no change detection)

**Static sites** use a two-stage Dockerfile: build with `node:20-alpine`, serve with `nginx:alpine`. See `apps/wally/` for reference.

**Node.js APIs** use a two-stage Dockerfile: build with `node:20-alpine`, run with `node:20-alpine`. Runtime secrets go in `environment` (not `build_args`). See `apps/api/` for reference.

### Internal Services

A top-level `services:` section in `deploy.yml` declares internal containers (e.g. Postgres) that join the shared docker network but get no Traefik routing and no host ports. Apps reach them by service name (`postgres:5432`). Named volumes are collected automatically. See `infra/README.md` for droplet secrets (`/opt/apps/.env`) and backups.

### The Shared API (apps/api)

`apps/api` is the backend platform for all apps at `api.ryanzrau.dev`: Hono + TypeScript on Postgres. It owns auth (`/auth/login|refresh|logout|me|jwks` — argon2 passwords, RS256 JWTs, rotating refresh tokens, closed signup via `npm run create-user` / `docker exec api node dist/scripts/create-user.js`) and per-app route modules behind the shared `requireAuth` middleware (e.g. `/wally/*`). To add a backend for a new app: add a SQL migration creating a dedicated Postgres schema, add a route module under `src/<app>/`, and mount it in `src/index.ts`. Frontends consume it via `packages/api-client`. Other services can verify its tokens against `https://api.ryanzrau.dev/auth/jwks`.

### deploy.yml Config Reference

| Field         | Required | Description                                                                          |
| ------------- | -------- | ------------------------------------------------------------------------------------ |
| `subdomain`   | Yes      | Subdomain for routing (`""` for root domain)                                         |
| `enabled`     | Yes      | `true` to deploy, `false` to take offline                                            |
| `port`        | Yes      | Container port (usually `80`)                                                        |
| `path`        | No       | Custom build context path (defaults to `apps/<name>`)                                |
| `build_args`  | No       | List of Docker build arg names, resolved from GitHub secrets at build time           |
| `environment` | No       | Map of runtime env vars passed to the container (use `${VAR}` to reference host env) |
| `depends_on`  | No       | Map of internal service → compose condition (e.g. `postgres: service_healthy`)       |
| `healthcheck` | No       | Compose healthcheck passthrough for the container                                    |

**Adding a new build arg or secret:**

1. Add the arg name to the app's `build_args` list in `deploy.yml`
2. Add a `case` entry in both `.github/workflows/deploy.yml` and `.github/workflows/test-deploy.yml` to map the arg name to the GitHub secret
3. Add the secret to the repo's GitHub settings

**Adding a runtime env var:**

1. Add it to the app's `environment` map in `deploy.yml`
2. Set the actual value as an environment variable on the droplet (in `/opt/apps/.env` or the deploy user's profile)

## Test Subdomain Deployments

Any app (or multiple apps) can be deployed to test subdomains from a feature branch without impacting production.

### How to use

1. Add `test-deploy.yml` to your feature branch:

   ```yaml
   # Single app
   app: bluestar

   # Multiple apps
   apps:
     - api
     - wally
   ```

   App names must match keys in `deploy.yml`.

2. Push the branch, then go to **Actions > Test Deploy > Run workflow** and select the branch.

3. Apps are deployed to test subdomains (e.g., `test-wally.ryanzrau.dev`). Re-run the workflow to deploy updates.

4. When the PR is merged to main, the **Test Cleanup** workflow automatically removes the test deployment.

### Test subdomain naming

- Root domain app (subdomain: `""`) → `test.ryanzrau.dev`
- Subdomain app (subdomain: `"ui"`) → `test-ui.ryanzrau.dev`
- Subdomain app (subdomain: `"be-mine"`) → `test-be-mine.ryanzrau.dev`

### How test deploy works

1. Reads `test-deploy.yml` from the branch to get the list of apps
2. Builds each app and pushes with `:test` tag to GHCR
3. SCPs the branch's `deploy.yml` and `infra/generate-compose.py` to the droplet
4. Writes `test-deploy.active.yml` on the droplet with app metadata (name, subdomain, port)
5. Runs `generate-compose.py` which merges prod + test services into one `docker-compose.yml`
6. Restores main's `deploy.yml` and `generate-compose.py` via `git checkout`
7. Pulls test images and brings everything up

### Key details

- Multiple apps can be test-deployed simultaneously
- The workflow must be triggered manually (does not run on push)
- `test-deploy.yml` is the branch config (committed); `test-deploy.active.yml` is the droplet runtime state (gitignored)
- The branch's `deploy.yml` is temporarily used on the droplet for generation, then restored

### Debugging test deploys

- **"App not found in deploy.yml"**: The app must exist in the branch's `deploy.yml` with a subdomain. The workflow SCPs the branch version to the droplet.
- **Image not found**: Test images use `:test` tag, not `:latest`. Check that the build step succeeded.
- **Site not loading**: Verify the test container is running (`docker ps | grep test`), check Traefik labels (`docker inspect <container>`), and confirm DNS resolves (`dig test-<subdomain>.ryanzrau.dev`).
- **Compose errors about missing services**: The workflow only pulls test images specifically, not all services. Check `test-deploy.active.yml` on the droplet.

## Code Quality

- ESLint + Prettier configured at repo root, enforced via PR validation workflow
- PR validation auto-fixes lint/format issues and commits them

## Conventions

- App directory names use snake_case (e.g., `be_mine`)
- Subdomains use kebab-case (e.g., `be-mine`)
- Each app in `apps/<name>/` has its own `Dockerfile` and `nginx.conf`; build source lives alongside or in `packages/`
- No shared build tooling (no turborepo/nx) — apps build independently
- Docker images: `ghcr.io/ryanrau/mono/<app>:latest` for prod, `:test` for test deploys

### New App Stack

New web apps should follow the same stack as `apps/ryanzrau`:

- **React + TypeScript** with Vite as the build tool
- Use `file:` references to local packages in `packages/` wherever possible (e.g., `"bluestar": "file:../../packages/bluestar"`)
- See `packages/PACKAGES.md` for what each local package exports and how to use it

**Template `package.json`:**

```json
{
  "name": "<app_name>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "bluestar": "file:../../packages/bluestar",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

> **Keep `packages/PACKAGES.md` up to date** whenever a package's exports or API changes.

## External App Deployments

External repos can deploy apps to unused `*.ryanzrau.dev` subdomains by joining the shared Traefik network (`traefik_web`). These apps run as separate Docker Compose projects on the droplet under `/opt/external/<app-name>/` and are invisible to the mono repo's deploy lifecycle.

The `web` network in `generate-compose.py` has a fixed name (`traefik_web`) so external containers can reliably join it with `external: true`.

### Why this is safe

- `--remove-orphans` only affects containers in the same Compose project. External apps use a different project (different directory), so mono deploys never touch them.
- Traefik routes by `Host()` rule — no port conflicts since containers don't bind host ports.
- When the mono repo redeploys and restarts Traefik, it re-discovers all labeled containers on the `traefik_web` network, including external ones.

### Setting up an external app

1. Add a two-stage `Dockerfile` (build with `node:20-alpine`, serve with `nginx:alpine`) and an `nginx.conf` with SPA `try_files` support.
2. Add a `docker-compose.yml` that joins the Traefik network as external:
   ```yaml
   networks:
     web:
       external: true
       name: traefik_web
   ```
   Include Traefik labels for routing (`Host(\`<subdomain>.ryanzrau.dev\`)`), TLS (`certresolver=le`), and security headers.
3. On the droplet, create `/opt/external/<app-name>/` owned by `deploy` and place the `docker-compose.yml` there.
4. Set up a GitHub Actions workflow to build/push to GHCR, then SSH to the droplet to `docker compose pull && docker compose up -d --force-recreate --remove-orphans` in that directory.
5. Required GitHub secrets in the external repo: `DROPLET_IP`, `DROPLET_SSH_KEY`, `GHCR_TOKEN`.

### Reserved external subdomains

Keep this list updated to avoid subdomain collisions:

- `drinkz.ryanzrau.dev`
