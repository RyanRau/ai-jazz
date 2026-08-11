# Infrastructure

Everything about the droplet that hosts the apps: how to build one, how deploys
reach it, and how to debug it when they don't.

## Tooling in this directory

| File                  | What it does                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `generate-compose.py` | Renders `deploy.yml` (+ optional test overlay) into `docker-compose.yml`  |
| `validate_deploy.py`  | Validates `deploy.yml` — run in CI and before pushing config changes      |
| `new_app.py`          | Scaffolds a new app from `templates/app` and registers it in `deploy.yml` |
| `templates/app/`      | The app template (`.tpl` files, placeholders substituted by `new_app.py`) |
| `AUDIT.md`            | Architecture assessment, known weaknesses, deliberate omissions           |

`generate-compose.py` and `validate_deploy.py` need `pyyaml` and nothing else.

## Architecture

- **Reverse proxy**: Traefik v2 routes by `Host()` and provisions Let's Encrypt
  TLS certificates automatically
- **Registry**: GitHub Container Registry (`ghcr.io`)
- **CI/CD**: GitHub Actions builds images and SSHes into the droplet to deploy
- **Config-driven**: `deploy.yml` at the repo root controls which apps are live

One droplet runs everything: Traefik, every enabled app, and PocketBase. Apps
never bind host ports — Traefik reaches them over the shared `traefik_web`
network.

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
name — the workflows resolve them by name, so no workflow edit is needed. Test
deploys prefer `TEST_<NAME>` when present.

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

## Test deployments

1. `test-deploy.yml` on a branch declares which apps to test
2. **Test Deploy** builds them with a `:test` tag
3. `test-deploy.active.yml` (gitignored) is written on the droplet so
   `generate-compose.py` adds test services alongside prod
4. Merging the PR triggers **Test Cleanup**, which removes the overlay

Test services get Traefik routing at `test-<subdomain>.ryanzrau.dev` (or
`test.ryanzrau.dev` for the root app) and inherit the app's environment,
healthcheck, and rate limits — but **not** its volumes, so a test PocketBase is
empty and ephemeral.

Limitations:

- One test deployment at a time (a single `test-deploy.active.yml`)
- The workflow is manual — it doesn't run on push
- A deploy to `main` removes the active test deployment (it deletes
  `test-deploy.active.yml`, and `--remove-orphans` drops the container)

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
