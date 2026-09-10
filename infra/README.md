# Infrastructure

Everything about the droplet that hosts the apps: how to build one, how deploys
reach it, and how to debug it when they don't.

## Tooling in this directory

| File                  | What it does                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-compose.py` | Renders `deploy.yml` into `docker-compose.yml`                                                                                                    |
| `validate_deploy.py`  | Validates `deploy.yml` — first step of the deploy, and runnable locally                                                                           |
| `select_apps.py`      | Decides which apps a change set affects; used by the deploy                                                                                       |
| `app_field.py`        | Reads one field (build path, a `build_args` name) out of `deploy.yml` for an app — used by the workflow instead of `yq`                           |
| `check_demotions.py`  | Fails the production deploy if a push would silently drop a currently-live app to the test target (see `CLAUDE.md`'s "Apps Still In Development") |
| `retire_test_apps.sh` | Removes the `mono-test` project from the droplet; run by CI or by hand                                                                            |
| `new_app.py`          | Scaffolds a new app from `templates/app` and registers it in `deploy.yml`                                                                         |
| `templates/app/`      | The app template (`.tpl` files, placeholders substituted by `new_app.py`)                                                                         |
| `AUDIT.md`            | Architecture assessment, known weaknesses, deliberate omissions                                                                                   |
| `traefik/dynamic/`    | Static Traefik routes for backends that aren't Docker containers Traefik can discover via labels — currently just `home-server/llm-gateway`       |

`generate-compose.py` and `validate_deploy.py` need `pyyaml` and nothing else.

## Architecture

- **Reverse proxy**: Traefik v2 routes by `Host()` and provisions Let's Encrypt
  TLS certificates automatically
- **Registry**: GitHub Container Registry (`ghcr.io`)
- **CI/CD**: GitHub Actions builds images and SSHes into the droplet to deploy
- **Config-driven**: `deploy.yml` at the repo root controls which apps are live

One droplet runs everything: Traefik, every enabled app, and PocketBase. Apps
never bind host ports — Traefik reaches them over the shared `traefik_web`
network. The one exception is `llm.ryanzrau.dev`: `home-server/llm-gateway`
runs on a Mac at home, not on this droplet, so Traefik reaches it over a
static route (`traefik/dynamic/llm-gateway.yml`, via Traefik's file provider)
through a WireGuard tunnel to the home network instead of a Docker label.

## 1. Droplet setup

SSH in as root.

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin python3-pip -y
pip3 install pyyaml
```

Create the deploy user and clone the repo:

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

su - deploy
mkdir -p /opt/apps && cd /opt/apps
git clone https://github.com/RyanRau/mono.git .
```

`/opt/apps` is the deploy path the workflows assume. Firewall:

```bash
ufw allow 22,80,443/tcp && ufw enable
```

## 2. SSH key

```bash
# On your machine
ssh-keygen -t ed25519 -f deploy_key -C "github-actions-deploy"
ssh-copy-id -i deploy_key.pub deploy@YOUR_DROPLET_IP
```

Keep the private key for the next step.

## 3. GitHub secrets

**Settings → Secrets and variables → Actions:**

| Secret            | Value                                         |
| ----------------- | --------------------------------------------- |
| `DROPLET_IP`      | The droplet's public IP address               |
| `DROPLET_SSH_KEY` | Contents of the `deploy_key` private key file |

`GITHUB_TOKEN` is provided automatically.

Any name listed in an app's `build_args` must also exist as a secret of the same
name — the deploy resolves them by name, so no workflow edit is needed.

## 4. DNS

Point a wildcard record at the droplet so new subdomains need no DNS work:

| Type | Name | Value           |
| ---- | ---- | --------------- |
| A    | \*   | YOUR_DROPLET_IP |
| A    | @    | YOUR_DROPLET_IP |

## 5. First deploy

Push to `main`, or do it by hand:

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps
git pull origin main
python3 infra/generate-compose.py
docker compose up -d
```

## 6. PocketBase data

PocketBase stores everything (SQLite DB, uploaded files, settings) under
`/pb/pb_data`, mounted from the `pb_data` named volume declared in `deploy.yml`.
The volume survives redeploys; deleting it wipes all data.

Create the first superuser once per fresh volume:

```bash
docker exec pocketbase /pb/pocketbase superuser upsert you@email.com 'a-strong-password'
```

Then log in at `https://api.ryanzrau.dev/_/`. Schema and hooks are baked into the
image — see `apps/pocketbase/README.md`.

### Backups

Enable PocketBase's built-in scheduled backups in the admin UI
(**Settings → Backups**), optionally targeting S3 / DigitalOcean Spaces. For a
belt-and-suspenders volume snapshot, add a cron for the `deploy` user:

```bash
mkdir -p /opt/backups
crontab -e
# 0 4 * * * docker run --rm -v apps_pb_data:/data -v /opt/backups:/backup alpine tar czf /backup/pb-$(date +\%u).tgz -C /data .
```

(Volume name is the compose project prefix + `pb_data`; confirm with
`docker volume ls`.)

## 7. Runtime secrets

Apps with an `environment` map in `deploy.yml` read `${VAR}` values from
`/opt/apps/.env`, which docker compose loads automatically:

```bash
sudo chown deploy:deploy /opt/apps/.env && sudo chmod 600 /opt/apps/.env
```

This file is plaintext on the droplet and is the blast radius of a droplet
compromise — keep it to what's actually needed.

## Debugging

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps

docker compose ps                    # what's running
docker compose logs -f <app>         # app logs
docker compose logs -f traefik       # routing / certificate issues
docker inspect <container>           # confirm Traefik labels

python3 infra/generate-compose.py    # regenerate and redeploy by hand
docker compose up -d --remove-orphans
```

Common cases:

- **502 from Traefik** — the container is down or listening on a different port
  than `deploy.yml` declares
- **Certificate not issued** — DNS must resolve to the droplet before Let's
  Encrypt's HTTP challenge can succeed; check the traefik logs
- **A deploy "succeeded" but the site is broken** — the workflow's verification
  step polls container health, so check its output first; a container that is
  `running` but serving errors is an app bug, not a deploy bug

## The workflow

One workflow, `deploy.yml`, with two targets. There is no PR gate — merge and it
ships.

| Target         | How it runs                                                                                  | Deploys                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **production** | Push to `main`, or manual **on `main` only** — a manual run off any other branch is rejected | Enabled apps **without** `development: true`, at their real subdomains, from `:latest`               |
| **test**       | Manual, on any branch                                                                        | Enabled apps **with** `development: true`, at `test-<subdomain>`, from `:test` built off that branch |

Run the test target from **Actions → Build and Deploy → Run workflow**: pick the
branch, set `target` to `test`.

### Why they can't clobber each other

The two targets deploy **different Compose projects**:

- production → project `apps`, `/opt/apps/docker-compose.yml`
- test → project `mono-test`, `/opt/apps/docker-compose.test.yml`

`docker compose --remove-orphans` is project-scoped, so a production deploy never
sees a test container and a test deploy never sees a production one. It's the same
isolation that lets apps from other repos share this droplet. On top of that the
two sets are disjoint by construction — the `development` flag decides which
project an app belongs to, so no app is ever in both — container names differ by a
`-test` suffix, image tags differ (`:latest` vs `:test`), and named volumes are
project-prefixed, so a test PocketBase gets its own empty volume rather than
production's data.

The test project joins the Traefik network as `external`, since production owns
both Traefik and the network. Production therefore has to have been deployed at
least once before a test deploy can work.

### Test compose lives in CI, not on the droplet

The test compose file is rendered in the workflow from the branch's `deploy.yml`
and copied over as a single artifact. The droplet's own checkout stays on `main`
and is never touched — no config SCP'd over the working tree, no `git checkout`
to undo it afterwards.

### A production deploy retires the test apps

Every production run ends by tearing the `mono-test` project down, so once `main`
has shipped, nothing is left serving a `test-*` subdomain. `main` is the whole
truth.

**This means a push to `main` removes whatever you were testing** — even an
unrelated push, and even a docs-only one where the deploy itself is skipped.
Re-run the test target to bring it back. The one exception is a _failed_
production deploy: the teardown runs after the deploy and verification steps, so
a broken production run leaves your test environment alone.

You can also retire test apps without a production deploy:

- run the test target with nothing marked `development: true`, or
- on the droplet: `cd /opt/apps && bash infra/retire_test_apps.sh`

### Demotion guard

A production run triggered by a `push` (not a manual dispatch) runs
`check_demotions.py` before deploying: it fails the run if the push would
silently move a currently-live app to the test target by flipping
`development: true` on its existing `deploy.yml` key, rather than adding a
second key for the new version. See `CLAUDE.md`'s "Apps Still In
Development" section for why that distinction matters.

### Everything else

A `concurrency: droplet` group means two runs queue rather than driving
`docker compose` on the same droplet at once. It never cancels — aborting a
half-finished deploy is worse than waiting.

A failed config check or image build stops a run **before** the droplet is
touched, so a broken build can't take the site down — it just doesn't deploy.

Production manual runs default to rebuilding everything; untick `build_all` to
rebuild only what the last commit touched. The test target always rebuilds every
development app — it's a deliberate action, not a diff.

Lint and formatting are **not** checked anywhere automatically. Run
`npm run lint && npm run format:check && npm run validate` before pushing if you
care to keep them clean.

## Droplet sizing

| Apps | Droplet Size  | Monthly Cost |
| ---- | ------------- | ------------ |
| 1–3  | 1 GB / 1 vCPU | ~$6          |
| 4–8  | 2 GB / 2 vCPU | ~$18         |
| 8–15 | 4 GB / 2 vCPU | ~$24         |

Traefik uses ~30MB RAM; a static nginx app is a few MB. PocketBase is the only
stateful service.

## Security posture

- The `deploy` user has Docker access but is not root
- The Docker socket is mounted read-only into Traefik
- Traefik's API dashboard is disabled
- HTTP redirects to HTTPS; HSTS is set with `includeSubdomains` and `preload`
- Every routed app gets `X-Frame-Options: SAMEORIGIN`, `nosniff`, a referrer
  policy, and per-IP rate limiting (tighter on `api`, which serves auth)
- Internal services get no Traefik labels and no host ports

See `AUDIT.md` for what this posture does _not_ cover.
