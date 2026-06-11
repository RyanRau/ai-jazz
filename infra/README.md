# Deployment Setup

This guide walks through setting up a Digital Ocean droplet to host all enabled apps from this monorepo.

## Architecture

- **Reverse proxy**: Traefik v2 handles subdomain routing and auto-provisions Let's Encrypt TLS certificates
- **Registry**: GitHub Container Registry (`ghcr.io`) — free with GitHub
- **CI/CD**: GitHub Actions builds Docker images and SSHs into the droplet to deploy
- **Config-driven**: `deploy.yml` in the repo root controls which apps are live

## Prerequisites

- A Digital Ocean droplet (or any Linux VPS)
- A domain name with DNS access
- A GitHub repo with Actions enabled

## 1. Droplet Setup

SSH into your droplet as root.

### Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y
```

### Install Python dependencies

```bash
apt install python3-pip -y
pip3 install pyyaml
```

### Create a deploy user

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
```

### Clone the repo

```bash
su - deploy
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/RyanRau/mono.git .
```

## 2. SSH Key Pair

Generate a key pair for GitHub Actions to SSH into the droplet.

```bash
# On your local machine
ssh-keygen -t ed25519 -f deploy_key -C "github-actions-deploy"

# Copy the public key to the droplet
ssh-copy-id -i deploy_key.pub deploy@YOUR_DROPLET_IP
```

Keep the private key — you'll add it as a GitHub secret in the next step.

## 3. GitHub Secrets

In your GitHub repo, go to **Settings > Secrets and variables > Actions** and add:

| Secret            | Value                                         |
| ----------------- | --------------------------------------------- |
| `DROPLET_IP`      | Your droplet's public IP address              |
| `SSH_PRIVATE_KEY` | Contents of the `deploy_key` private key file |

`GITHUB_TOKEN` is automatically available — no need to create it.

## 4. DNS

Point your domain (or subdomains) to the droplet.

**Option A — Wildcard (recommended):**

| Type | Name | Value           |
| ---- | ---- | --------------- |
| A    | \*   | YOUR_DROPLET_IP |

**Option B — Per-subdomain:**

| Type | Name      | Value           |
| ---- | --------- | --------------- |
| A    | @         | YOUR_DROPLET_IP |
| A    | subdomain | YOUR_DROPLET_IP |

_(Use `@` for the root domain, or specific names for subdomains)_

## 5. Configure deploy.yml

Edit `deploy.yml` in the repo root with your actual values:

```yaml
domain: yourdomain.com
registry: ghcr.io/ryanrau/mono
letsencrypt_email: you@yourdomain.com

apps:
  ryanzrau:
    subdomain: "" # Empty string for root domain (yourdomain.com)
    enabled: true
    port: 80
  # Example of a subdomain app (would be at subdomain.yourdomain.com):
  # apping:
  #   subdomain: app
  #   enabled: true
  #   port: 80
```

## 6. The Shared Backend (PocketBase)

`apps/pocketbase` is the backend for all apps at `api.ryanzrau.dev` — a single PocketBase binary (auth, collections, admin UI, custom hook routes) on embedded SQLite. It's a normal Traefik-routed app, with one extra: a named volume for its data.

### Data volume

PocketBase stores everything (SQLite DB, uploaded files, settings) under `/pb/pb_data`, mounted from the `pb_data` named volume (declared on the app in `deploy.yml`; named volumes are auto-registered in the generated compose file). The volume survives redeploys; deleting it wipes all data.

### First-run setup (once per fresh volume)

The schema (collections, closed signup) is created automatically by the migrations baked into the image. You only need to create the first superuser:

```bash
ssh deploy@YOUR_DROPLET_IP
docker exec pocketbase /pb/pocketbase superuser upsert you@email.com 'a-strong-password'
```

Then log in at `https://api.ryanzrau.dev/_/` to manage data. Signup is closed, so create app/automation user accounts in the admin UI (Collections → users → New record). For machine clients (n8n etc.), make a dedicated least-privilege user — never hand out the superuser.

### Backups

PocketBase has built-in backups: in the admin UI, **Settings → Backups**, enable a schedule (and optionally S3/DigitalOcean Spaces as the backup store). For a belt-and-suspenders volume snapshot, you can also tar the data nightly via cron for the `deploy` user:

```bash
mkdir -p /opt/backups
crontab -e
# 0 4 * * * docker run --rm -v apps_pb_data:/data -v /opt/backups:/backup alpine tar czf /backup/pb-$(date +\%u).tgz -C /data .
```

(Volume name is the compose project prefix + `pb_data`; confirm with `docker volume ls`.)

### Internal services & runtime secrets

A top-level `services:` section in `deploy.yml` can add internal-only containers (e.g. Redis) — un-routed, no host ports, reached by service name. None are configured now (PocketBase uses SQLite). If you later add an app needing runtime secrets (e.g. an admin service calling the Claude API), put them in `/opt/apps/.env` (loaded automatically by docker compose for `${VAR}` interpolation) and **make sure the `deploy` user can read it**:

```bash
sudo chown deploy:deploy /opt/apps/.env && sudo chmod 600 /opt/apps/.env
```

### Test deploys

A test-deployed `pocketbase-test` does **not** get the `pb_data` volume (volumes aren't attached to `-test` variants), so it starts with an empty, ephemeral database — safe for testing, and it won't touch prod data.

## 7. First Deploy

Either push to `main` to trigger the GitHub Actions workflow, or deploy manually on the droplet:

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps
git pull origin main
python3 infra/generate-compose.py
docker compose up -d
```

## Debugging

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps

# Check running containers
docker compose ps

# View logs for a specific app
docker compose logs -f ryanzrau

# View Traefik logs (routing issues)
docker compose logs -f traefik

# Manually regenerate and redeploy
python3 infra/generate-compose.py
docker compose up -d --remove-orphans
```

## Droplet Sizing

| Apps | Droplet Size  | Monthly Cost |
| ---- | ------------- | ------------ |
| 1–3  | 1 GB / 1 vCPU | ~$6          |
| 4–8  | 2 GB / 2 vCPU | ~$18         |
| 8–15 | 4 GB / 2 vCPU | ~$24         |

Traefik uses ~30MB RAM.

## Security Notes

- The `deploy` user has Docker access but is not root
- Docker socket is mounted read-only to Traefik
- Traefik's API dashboard is disabled
- HTTP automatically redirects to HTTPS
- Let's Encrypt certificates auto-renew
- Consider adding UFW firewall rules: `ufw allow 22,80,443/tcp`

## Test Subdomain Deployments

You can deploy any app to a test subdomain from a feature branch without impacting production. This lets you preview changes on a real URL before merging.

### How it works

1. A `test-deploy.yml` file in your branch declares which app to test
2. The **Test Deploy** workflow builds that app from your branch and pushes it with a `:test` image tag
3. On the droplet, a `test-deploy.active.yml` runtime file is written (gitignored) so `generate-compose.py` adds a test service alongside all prod services
4. On PR merge to main, the **Test Cleanup** workflow removes the test service automatically

### Test subdomain naming

The test subdomain is derived from the app's prod subdomain:

| App        | Prod URL               | Test URL                    |
| ---------- | ---------------------- | --------------------------- |
| `ryanzrau` | `ryanzrau.dev`         | `test.ryanzrau.dev`         |
| `bluestar` | `ui.ryanzrau.dev`      | `test-ui.ryanzrau.dev`      |
| `be_mine`  | `be-mine.ryanzrau.dev` | `test-be-mine.ryanzrau.dev` |

No DNS changes are needed — the wildcard `*.ryanzrau.dev` record covers all test subdomains.

### Step by step

**1. Add `test-deploy.yml` to your branch:**

```yaml
app: bluestar
```

The `app` value must match a key in `deploy.yml`.

**2. Push your branch and trigger the workflow:**

Go to **Actions > Test Deploy > Run workflow**, then select your branch from the dropdown.

**3. Visit the test URL:**

Your branch version is now live at the test subdomain (e.g., `test-ui.ryanzrau.dev`).

**4. Iterate:**

Push more changes to the branch, then re-run the Test Deploy workflow to update the test deployment.

**5. Merge to main:**

When your PR is merged, the **Test Cleanup** workflow runs automatically. It removes `test-deploy.active.yml` from the droplet, regenerates the compose file, and redeploys — the test container is removed by `--remove-orphans`.

### Limitations

- Only one test deployment can be active at a time (one `test-deploy.active.yml` on the droplet)
- The test deploy workflow must be triggered manually — it does not run on push
- If a prod deploy (`push to main`) happens while a test is active, the test service will persist because `test-deploy.active.yml` remains on the droplet
