# pocketbase — the shared backend

One PocketBase binary at `api.ryanzrau.dev` serving **every** app in this repo:
auth, collections, realtime subscriptions, file storage, an admin UI at `/_/`,
and custom routes. Data lives in embedded SQLite on the `pb_data` volume.

There is no second backend. If a new app needs persistence, it gets a collection
here — not its own database.

## Layout

| Path             | What it is                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| `Dockerfile`     | Pinned PocketBase release + this directory's migrations and hooks      |
| `pb_migrations/` | Version-controlled schema. Applied automatically, in filename order    |
| `pb_hooks/`      | Custom `/api/custom/*` routes (see `pb_hooks/README.md`)               |
| `pb_data/`       | Runtime data — gitignored, lives in the Docker volume, never committed |

## Adding a collection for a new app

Two routes to the same place; both end in a committed migration file.

**Write it by hand** — create `pb_migrations/<unix-ts>_<app>_<what>.js`:

```js
/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    app.save(
      new Collection({
        type: "base",
        name: "<app>_<thing>",
        fields: [
          { type: "text", name: "label", required: true, max: 200 },
          { type: "text", name: "notes", max: 2000 },
        ],
        // Owner-scoped by default. Use `@request.auth.id != ""` for
        // any-signed-in-user, or `null` to disable the operation entirely.
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("<app>_<thing>"));
  }
);
```

**Or design it in the admin UI** on a local instance, then commit the migration
file PocketBase auto-generates into `pb_migrations/`.

Conventions:

- Prefix collection names with the owning app (`recipes_entries`, not `entries`)
  so one shared backend stays legible as apps accumulate.
- **Always set access rules.** An unset rule means superuser-only; an empty
  string (`""`) means _fully public_. Never leave `listRule: ""` on anything you
  wouldn't post publicly.
- Migrations are append-only once deployed. To change a deployed collection, add
  a new migration — never edit an applied one, since PocketBase records applied
  filenames and will not re-run them.

## Collections in this backend

Beyond PocketBase's built-in `users` (two extra fields: `is_admin` — dashboard
admin rights; `is_service` — marks a machine/service account like the
llm-gateway, checked in hooks instead of granted broader access):

| Collection                          | What it's for                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registry_apps` / `registry_grants` | Cross-app dashboard registry — the catalog of apps and who may see which one. Any signed-in user can read `registry_apps`; `registry_grants` is superuser-write-only (Admin UI), user-read-own-rows-only. `hub` reads `registry_grants` to know what to show; `stash`/`tony` gate access the same way.                                     |
| `stash_items`                       | `stash`'s inventory rows — owner-scoped, with view-only sharing via `shared_with` (a list of user ids) resolved through `pb_hooks/stash_shareable_users.pb.js`.                                                                                                                                                                            |
| `llm_api_keys` / `llm_usage_logs`   | API keys and per-request usage for `home-server/llm-gateway`. Both are superuser-only via unset rules — every read/write goes through `pb_hooks/llm.pb.js` instead, so a plaintext key exists only in its one creation response (only its hash and a short prefix are ever stored).                                                        |
| `llm_chats` / `llm_chat_messages`   | Persistent chat history for `tony`'s Chat page. Both are superuser-only via unset rules, owner-only with no admin override (unlike the two above), all access through `pb_hooks/chat.pb.js`. `content` is AES-encrypted at rest (`$security.encrypt`/`decrypt`, key from the `CHAT_ENCRYPTION_KEY` env var — see "Runtime secrets" below). |

## Talking to it from an app

Use the official JS SDK — there is no local wrapper package.

```bash
npm i pocketbase
```

```ts
import PocketBase from "pocketbase";

const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? "https://api.ryanzrau.dev");

await pb.collection("users").authWithPassword(email, password);
const rows = await pb.collection("recipes_entries").getFullList();
```

The SDK persists the auth token in `localStorage` and refreshes it automatically.

## Auth

Signup is **closed** — the baseline migration sets the `users` collection's
`createRule` to `null`. Onboard a real person through hub's `/admin` page
("Invite user"), not the admin UI: it creates a `verified: false` stub,
lets you pre-grant app access, and returns an activation link (mailed
automatically if SMTP is configured — see "Email (optional)" below —
always shown for you to copy otherwise). The invitee sets their own
password and name at `hub.ryanzrau.dev/activate`, backed by
`POST /api/custom/admin/invite` and `GET /api/custom/admin/access` in
`pb_hooks/admin.pb.js`. Creating a user by hand in the admin UI (Collections
→ users → New record) still works — mainly useful for a machine/service
account, which has no activation flow to speak of.

For machine clients (n8n, scripts, other services), create a dedicated
least-privilege user and authenticate with
`POST /api/collections/users/auth-with-password`, then send the returned token in
the `Authorization` header. Never hand out superuser credentials.

## Email (optional)

Hub's invite feature always works link-only, with no setup. Configuring
SMTP additionally emails the invite link automatically. Add these as GitHub
repo secrets, with exactly these names — a production deploy resolves them
automatically into `/opt/apps/.env` on the droplet (see `pocketbase`'s
`environment` map in `deploy.yml`, and `infra/README.md`'s "Runtime
secrets") — no SSH needed. All optional, all unset by default:

| Variable              | Example (Zoho Mail)                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`           | `smtp.zoho.com`                                                                                                            |
| `SMTP_PORT`           | `587`                                                                                                                      |
| `SMTP_USERNAME`       | your Zoho address                                                                                                          |
| `SMTP_PASSWORD`       | an app-specific password (required if the account has 2FA enabled — a regular login password won't authenticate over SMTP) |
| `SMTP_SENDER_ADDRESS` | usually the same as `SMTP_USERNAME`                                                                                        |
| `SMTP_SENDER_NAME`    | e.g. `Ryan Rau Apps`                                                                                                       |

`pb_hooks/mailer_config.pb.js` reads these at boot and configures
PocketBase's own settings-level SMTP client (`$app.newMailClient()`) —
generic, not Zoho-specific; any standard SMTP provider works the same way.
Once configured, that mailer is available to _any_ hook in this file, for
any app, not just invites.

The hook always connects via StartTLS on `SMTP_PORT=587` — the port
Zoho (and most providers) expect for that flow. If a provider needs
implicit TLS instead (port 465), `mailer_config.pb.js`'s hard-coded
`tls: false` needs to flip along with the port. A send failure is never
fatal to the invite request (it just falls back to link-only), but it is
logged — check Admin UI → Logs (`https://api.ryanzrau.dev/_/`) for the
actual SMTP error if `sent` keeps coming back `false`.

**Once this hook is deployed, these env vars are the sole source of truth
for SMTP settings** — a superuser who hand-edits SMTP in the Admin UI
(Settings → Mail) will have that change reverted on the next restart. Set
it here, not there.

## Operations

First run against a fresh `pb_data` volume, create the superuser:

```bash
ssh deploy@<droplet>
docker exec pocketbase /pb/pocketbase superuser upsert you@email.com 'a-strong-password'
```

Then log in at `https://api.ryanzrau.dev/_/`.

**Backups:** admin UI → Settings → Backups → enable a schedule (optionally to S3
/ DigitalOcean Spaces). See `infra/README.md` for the belt-and-suspenders volume
tar cron.

**Upgrades:** `PB_VERSION` is pinned in the `Dockerfile`. PocketBase is pre-1.0
and ships breaking changes between minor versions — read the release notes and
take a backup before bumping.

**Runtime secrets:** `deploy.yml` declares `CHAT_ENCRYPTION_KEY` (the AES key
`pb_hooks/chat.pb.js` uses to encrypt chat message content at rest) as an
`environment` entry, read from `/opt/apps/.env` on the droplet — see
`infra/README.md`'s "Runtime secrets" section for how that file is set up. A
missing key falls back to a hardcoded dev-only value, so don't skip this in
production or every chat message is encrypted with a key anyone can read out
of this repo.

## Local development

```bash
docker build -t pb -f apps/pocketbase/Dockerfile .
docker run --rm -p 8080:8080 -v "$PWD/.pb_data:/pb/pb_data" pb
```

Admin UI at `http://localhost:8080/_/`. The build context is the repo root — run
the command from there, not from this directory.
