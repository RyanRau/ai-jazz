# Monorepo & Deployment Audit (August 2026)

Assessment of the monorepo + subdomain deployment pattern against its actual
goal: **launching small web apps quickly, mostly AI-assisted, onto one droplet.**

Verdict: the architecture is sound and cheap, and scales comfortably to ~10 apps.
The friction was never the infrastructure design — it was that adding an app
required hand-assembling boilerplate, and that the documentation described a repo
that no longer existed.

## Strengths

- **Config-driven control plane** — `deploy.yml` is a single source of truth;
  toggling `enabled` deploys or removes an app. `generate-compose.py` is small
  and inspectable, avoiding heavyweight orchestration.
- **Traefik + Let's Encrypt + wildcard DNS** — a new subdomain needs zero DNS or
  TLS work, and security headers are applied uniformly to every app.
- **A single deploy path** — every app, including ones still in development,
  ships through the same build-and-deploy; nothing has a bespoke pipeline.
- **External app isolation** — separate Compose projects on the shared
  `traefik_web` network can't be touched by mono deploys.
- **Multi-stage Dockerfiles** — small runtime images with a clean split between
  baked build args and injected runtime env.
- **One shared backend** — a single PocketBase instance means a new app gets a
  collection, not a database, a migration story, and a backup story.

## Changes made in this pass

**Cleanup**

- Removed `apps/be_mine` — a Create React App valentine card, undeployed, absent
  from `deploy.yml`, and the only thing in the repo on `react-scripts`.
- Removed `docs/receipt-processing.md` and the top-level `docs/` directory. It
  was a design document for the retired Wally app; documentation now lives beside
  what it documents.
- Stripped the last Wally remnants from PocketBase: the `preferred_products`
  collection and the `cart_link` hook. The init migration is now a neutral
  baseline (close signup), with a guarded migration dropping the old collection
  from the existing volume.

**Framework**

- `infra/new_app.py` scaffolds a complete, deployable app from
  `infra/templates/app` and registers it in `deploy.yml` — the single largest
  reduction in time-to-live-app. Verified end to end: the generated app installs,
  type-checks, and builds.
- `infra/validate_deploy.py` enforces config invariants (duplicate subdomains,
  missing Dockerfiles, reserved-subdomain collisions, malformed fields) and runs
  as the deploy's first step.
- Build args now resolve from same-named GitHub secrets automatically, removing
  the hardcoded `case` statements that had to be edited in two workflows for
  every new secret.
- Change detection: a push rebuilds only affected apps; changes to shared paths
  (`packages/`, `infra/`, `deploy.yml`, workflows) still rebuild everything.
- Buildx layer caching (`type=gha`) on every image build.
- Post-deploy verification polls container status and health, so a container that
  crashes on boot fails the deploy instead of quietly serving 502s.
- Lint and format now cover `packages/` (previously only `apps/` was checked, so
  the component library was unchecked); the dead `bandit`/`pip-audit` steps —
  which had no Python dependencies to scan — were dropped.
- Added Dependabot for GitHub Actions and npm.

**Workflow simplification**

Went from four workflows to one. The typical flow is build-and-deploy; the rest
was machinery serving a preview path that was rarely used in practice, and a PR
gate that was never waited on.

- **Deleted `test-deploy.yml` and `test-cleanup.yml`**, and with them the whole
  test-overlay system: the `test-deploy.yml` branch config, the
  `test-deploy.active.yml` droplet state file, the `:test` image tag, the SCP of
  branch config onto the droplet, and the `git checkout` restore afterwards.
- **Replaced it with `development: true` on an app in `deploy.yml`**, which
  routes that app at `test-<subdomain>` instead of `<subdomain>`. It deploys
  through the normal pipeline; promoting is deleting one line, and the
  regenerated compose plus `--remove-orphans` handles the transition. Validation
  rejects a hand-written `test-*` subdomain so the namespace stays derived, and
  allows a development app and a production app to share a `subdomain` value,
  which is what makes promotion a one-line change rather than a cutover.
- **Deleted `pr-validation.yml` too.** It was never waited on, so it was a
  runner cost and a red X rather than a gate. What it uniquely enforced —
  ESLint, Prettier, Ruff — is now local-only (`npm run lint`, `format:check`,
  `validate`). What actually protects the site it did not uniquely provide: the
  deploy validates `deploy.yml` and builds every affected image _before_ it
  touches the droplet, so a bad config or a broken build fails the run without
  deploying.

Problems found along the way:

- **No concurrency control anywhere.** A merge fired Build and Deploy _and_ Test
  Cleanup simultaneously, both SSHing in to run `docker compose up` against the
  same project; two quick pushes to `main` raced the same way. Deploy now holds a
  `concurrency: droplet` group that queues rather than cancels. (Deleting Test
  Cleanup removes the merge-time race entirely, but the rapid-push race was real
  on its own.)
- **PR validation rebuilt every app on every PR**, so a README typo cost three
  Docker builds — moot now that the workflow is gone, but the same fix applies
  to the deploy, which builds only what a push affected.

Change selection lives in `infra/select_apps.py` rather than workflow YAML, so it
is unit-testable outside CI — which matters, since workflow shell is otherwise
only ever exercised in production.

**What this trades away:** previewing an _unmerged_ branch on a real URL. The
`development` flag covers "this app isn't ready for its real subdomain," not
"show me this branch before I merge it." Given the actual habit is testing live,
that's the right trade — and `infra/README.md` records the shape to add back if
it's ever needed.

**Documentation**

- Rewrote the root `README.md`, `CLAUDE.md`, and `infra/README.md`, all of which
  described apps that no longer exist (`apps/bluestar`, `be_mine`), a deploy path
  that was wrong (`/home/deploy/mono` vs `/opt/apps`), a secret name that was
  wrong (`SSH_PRIVATE_KEY` vs `DROPLET_SSH_KEY`), and change-detection behavior
  that didn't exist at the time.
- Rewrote `packages/PACKAGES.md`, which documented a **different component API
  than the one that ships** — a `Theme` with `spacing`/`fontSizes`/`shadows`
  maps that don't exist, `Text` props (`bold`, `italic`, `muted`, `size`) that
  aren't accepted, `Header` variants `h4`–`h6` that aren't supported, and none of
  the six form components. For an AI-assisted workflow this was the most damaging
  drift in the repo: it reliably produces code that doesn't compile.
- Added per-project READMEs (`apps/pocketbase`, `apps/ryanzrau`,
  `packages/bluestar`, `apps/pocketbase/pb_hooks`).

**Security**

- `X-Frame-Options` was `ALLOWALL` on **every** app — meaning any site could
  frame them, including the PocketBase admin UI. Now `SAMEORIGIN` by default,
  overridable per app.
- Added per-IP rate limiting to every router, tighter on `api` (auth endpoints
  and admin UI).
- `.dockerignore` now excludes `.env` files from all build contexts, so a local
  secrets file can't be baked into a published image layer.
- nginx configs no longer advertise their version, and set cache headers that
  stop clients pinning a stale bundle after a deploy.

**Bug found and fixed**

- `npm install` inside an app failed on a clean clone. Apps depend on bluestar
  via `file:`, which triggers bluestar's `prepare` (tsup) build — but npm does
  not install bluestar's devDependencies to run it, so `tsup: not found`. The
  documented workflow ("rely on `prepare`") could never have worked from a fresh
  checkout. Added `npm run bootstrap`, taught the scaffolder to bootstrap first,
  and documented the ordering, which now matches what the Dockerfiles already did.

## Secret scan

Scanned the working tree and **all reachable git history** for credentials:
private keys, cloud access keys, provider token prefixes (`ghp_`, `github_pat_`,
`sk-ant-`, `xox*-`, `AKIA*`), hardcoded IPs, and assigned values in every version
of every `.env*` file ever committed.

**No live secrets found, in the tree or in history.** Every hit was a
placeholder (`sk-ant-xxxxx`, `your-spaces-key`, `DO_SPACES_SECRET=your-spaces-secret`)
in an `.env.example` from a since-deleted app. Notably, `b7fd2b4`
("remove S3 keys from client") removed the _plumbing_ for client-side S3
credentials, not committed credentials — the `.env.example` there was
placeholders too.

Nothing needs rotating on the basis of repo contents, and no history rewrite is
warranted.

One thing to keep in mind rather than fix: anything passed as a `VITE_*` build
arg is compiled into the published JavaScript bundle and is **public**, however
it is stored in GitHub. Secrets belong in runtime env on a server-side container,
never in a frontend build.

## Known weaknesses (accepted for now)

| Issue                                                                                 | Impact                                        | Mitigation if it starts to hurt                                                                                     |
| ------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Single droplet** — one machine is a SPOF for every app                              | Total outage on droplet failure               | Acceptable for personal apps; backups + these setup docs make a rebuild ~1hr. Multi-node isn't worth the cost yet   |
| **No monitoring/alerting** — failures are discovered by visiting the site             | Silent downtime between deploys               | Cheapest real fix available: an external uptime ping (UptimeRobot / healthchecks.io) against `/api/health`          |
| **No rollback** — a bad image stays live until the next push                          | Recovery requires a revert commit and rebuild | Deploy verification now _detects_ a failed boot; retagging the previous GHCR image is still manual                  |
| **Secrets via SSH env + dotenv** — `/opt/apps/.env` is plaintext on the droplet       | Droplet compromise = all runtime secrets      | `chmod 600` + deploy-user-only; a secrets manager is overkill at this scale                                         |
| **Third-party actions pinned by tag** — `appleboy/ssh-action@v1` etc. get the SSH key | A compromised tag could exfiltrate the key    | Pin to commit SHAs; Dependabot now keeps them current, which is the intermediate step                               |
| **Single SQLite backend** — PocketBase is one container on one disk                   | Backend down = all apps lose data access      | Fine at this scale; scheduled backups + the volume. SQLite is plenty for personal traffic                           |
| **Pre-1.0 backend** — PocketBase v0.x breaks between minor versions                   | Upgrades may need migration tweaks            | `PB_VERSION` is pinned; read release notes and back up before bumping                                               |
| **Traefik v2.11** — v3 is current                                                     | Falling behind on fixes                       | Upgrade needs label/CLI migration; do it deliberately with a test deploy first                                      |
| **No npm workspaces** — the `file:` + bootstrap dance is a papercut                   | One extra command on a fresh clone            | Workspaces would fix it, but the per-app `npm ci` in each Dockerfile would need reworking; not worth the risk today |

## Recommended next steps, in order of value

1. **External uptime monitoring** against `api.ryanzrau.dev/api/health` and the
   root domain. It's free and closes the biggest gap: nobody currently learns
   about downtime except by looking.
2. **Pin third-party actions to commit SHAs.** `appleboy/ssh-action` and
   `appleboy/scp-action` receive the droplet SSH key; a tag is mutable.
3. **Restrict the PocketBase admin UI.** `/_/` is publicly reachable and
   protected only by the superuser password and rate limiting. A Traefik
   IP-allowlist middleware on that path prefix would remove it from the internet
   entirely.
4. **Automate a rollback path** — tag each deploy's image with the commit SHA
   alongside `:latest`, so rolling back is retagging rather than reverting and
   rebuilding.
5. **Revisit npm workspaces** when adding a third or fourth app, together with a
   Dockerfile pass, rather than piecemeal.

## Deliberately not done

- **Turborepo / Nx** — apps build independently in Docker; a build graph adds
  tooling for little gain at this size.
- **Kubernetes / managed PaaS** — Compose on a droplet is dramatically simpler
  and cheaper for this workload.
- **Blue-green deploys** — seconds of restart downtime is acceptable here.
- **Per-app backends** — deliberately rejected. One PocketBase is the reason a
  new app is a weekend and not a project.

## Verification notes

`generate-compose.py`, `validate_deploy.py`, and `new_app.py` were each run and
their output inspected; a scaffolded app was installed, type-checked, and built
successfully, then removed. ESLint, Prettier, and Ruff all pass repo-wide. Docker
image builds and the deploy workflows themselves could **not** be executed here
(no Docker daemon in the audit environment) — the first push to `main` is their
first real run.
