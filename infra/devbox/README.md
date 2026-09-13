# devbox

A disposable, local copy of the whole app stack — every enabled app in
`deploy.yml` plus PocketBase — built from real source and routed through a
shared local Traefik, so the URLs look like production (`tony.<slug>.localtest.me`
instead of `tony.ryanzrau.dev`) without touching the droplet. Run several at
once: each gets its own random slug, its own Compose project, and its own
PocketBase data, so they can't collide with each other or with a real deploy.

## Quick start

```bash
infra/devbox/devbox up               # fresh clone of origin/main, random slug
infra/devbox/devbox up --local       # build the checkout you're sitting in
infra/devbox/devbox up --ref my-branch
infra/devbox/devbox ls
infra/devbox/devbox logs <slug>
infra/devbox/devbox down <slug>      # stop it (add --purge to also drop its volumes)
```

`up` prints the URLs when it's done, e.g.:

```
devbox 'swift-otter' is up:
  http://api.swift-otter.localtest.me
  http://swift-otter.localtest.me
  http://ui.swift-otter.localtest.me
  http://stash.swift-otter.localtest.me
  http://tony.swift-otter.localtest.me
```

Requires Docker (with the `docker compose` plugin) and `python3` with
`pyyaml` — the same as the rest of `infra/`. Inside the devcontainer (see
`.devcontainer/`) both are already set up.

## Why `localtest.me`

It's a public DNS wildcard: `anything.localtest.me` (and any nesting under
it) resolves to `127.0.0.1`, maintained for exactly this purpose. That means
zero local setup — no `/etc/hosts` edits, no dnsmasq — and it works the same
on every machine with normal internet DNS. Pass `--domain` to `devbox up` to
use a different one.

If you'd rather have a literal `tony.devbox`-style alias, set up a wildcard
resolver once and pass `--domain devbox`:

- **macOS**: `brew install dnsmasq`, add `address=/devbox/127.0.0.1` to its
  config, then create `/etc/resolver/devbox` containing `nameserver 127.0.0.1`
  so macOS only consults it for that one TLD.
- **Linux**: install `dnsmasq`, add `address=/devbox/127.0.0.1`, and point
  `/etc/resolv.conf` (or NetworkManager's dnsmasq integration) at it.

`localtest.me` needs none of that, which is why it's the default.

## How it fits together

- `infra/generate-compose.py --devbox --slug <slug>` renders `deploy.yml`
  into a Compose file: every enabled app (regardless of the `development`
  flag — a devbox isn't gated by the promotion workflow), built from local
  source (`build:`, not a registry `image:`), on plain HTTP, at
  `<subdomain>.<slug>.<domain>`. This is the same script and the same
  `deploy.yml` production renders from — a devbox stays honest about what's
  actually deployed instead of drifting into its own parallel config.
- `docker-compose.traefik.yml` is a small, static, long-lived Traefik that
  only discovers containers by label — it's started once (`devbox up` brings
  it up if it isn't already running) and stays up across however many
  instances you create and tear down. It owns the `devbox_web` network and
  host port 80; every instance's app stack joins that network as `external`,
  the same pattern production uses to let the `mono-test` project and
  external repos share one Traefik.
- Each instance is its own Compose project (`devbox-<slug>`), so
  `--remove-orphans` semantics and named-volume prefixing keep them fully
  isolated from each other and from a real deploy — a second instance's
  PocketBase never sees the first one's data.
- Instance state (which workdir it was built from, its domain, when it was
  created) lives in `~/.devbox/instances/<slug>/`, outside the repo, so
  nothing this generates ever needs a `.gitignore` entry beyond the
  top-level `docker-compose.devbox.yml` scratch file `--local` runs can
  produce if you invoke `generate-compose.py` by hand.

## PocketBase

Each instance's PocketBase starts with an empty `pb_data` volume. `devbox up`
waits for it to become healthy and bootstraps a superuser automatically:

```
dev@devbox.local / devbox-dev-password
```

This is a fixed, dev-only credential — never point a devbox at anything
that matters, and never reuse this password anywhere real.

## `--local` vs. the default fresh clone

- **Default** (no flags): clones `origin/main` at `--depth 1` into
  `~/.devbox/instances/<slug>/src` and builds that. Good for a disposable,
  known-good baseline, or for running several independent previews side by
  side without juggling multiple checkouts.
- **`--local`**: builds whatever is actually checked out in this repo right
  now — uncommitted edits included. This is what you want when previewing
  the change you're mid-way through, e.g. from inside the devcontainer while
  a CLI agent is editing code alongside you. After `devbox down <slug>`, use
  `--name <same-slug>` on the next `up --local` to rebuild with new edits (a
  running instance doesn't hot-reload; it's a built image, not a dev server).

## Using this from VS Code

`.devcontainer/` gives Node, Python, the Docker CLI (talking to the _host's_
daemon — anything `devbox up` starts runs on your real machine, not trapped
in a nested container), and the Claude Code CLI, either way below. Once
attached, `infra/devbox/devbox up --local` from the integrated terminal
becomes reachable from your normal browser at `http://<app>.<slug>.localtest.me`,
because the containers it starts are siblings on your host's Docker.

**If you already have the repo checked out:** open it in VS Code, "Reopen in
Container" — this builds `.devcontainer/devcontainer.json` (features +
`postCreateCommand`) against that checkout.

**If you don't want a local checkout at all:** run the standalone,
prebuilt image instead. It needs nothing on your machine but Docker — it
clones the repo into _its own_ filesystem the first time it starts, into a
named volume so the clone (and anything you build inside it) survives a
restart:

```bash
docker volume create mono-workspace

docker run -d --name mono-dev \
  -e REPO_REF=main \
  -v mono-workspace:/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/.ssh:/root/.ssh:ro \
  ghcr.io/ryanrau/mono/devcontainer:latest
```

Then in VS Code: `Cmd/Ctrl+Shift+P` → **"Dev Containers: Attach to Running
Container..."** → `mono-dev` → open `/workspace/mono`. Nothing is ever
written to your filesystem directly — the clone lives inside the
`mono-workspace` Docker volume, not a folder you'd see in Finder/Explorer.

Notes:

- `-v ~/.ssh:/root/.ssh:ro` gives the container your GitHub identity to clone
  a private repo (and to `git push` from inside it later) — the entrypoint
  adds `github.com`'s host key at every startup so it doesn't hang on an
  unanswerable host-key prompt, since mounting `~/.ssh` replaces the whole
  directory, including anything baked into the image at build time.
- `-v /var/run/docker.sock:/var/run/docker.sock` is what makes `devbox up`
  work from inside this container at all (docker-outside-of-docker, done by
  hand here rather than via a devcontainer feature).
- `-e REPO_REF=<branch>` clones a different branch — e.g. one that hasn't
  merged to `main` yet, like this feature.
- The image is published by `.github/workflows/devcontainer-image.yml`
  whenever `.devcontainer/**` changes on `main`, or on demand via **Actions →
  Build Devcontainer Image → Run workflow**. It's dev tooling, not a deployed
  app, so it's outside `deploy.yml` and the regular Build and Deploy workflow.
- Muse Code isn't baked into the image (its installer is `curl | bash` from
  a third-party host — not something that should run unattended at
  image-build time). Run it once yourself after attaching:
  `curl -fsSL https://dev.meta.ai/install.sh | bash`.
