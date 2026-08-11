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
`createRule` to `null`. Create accounts in the admin UI (Collections → users →
New record).

For machine clients (n8n, scripts, other services), create a dedicated
least-privilege user and authenticate with
`POST /api/collections/users/auth-with-password`, then send the returned token in
the `Authorization` header. Never hand out superuser credentials.

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

**Test deploys:** `pocketbase-test` gets no `pb_data` volume, so it starts empty
and ephemeral. It cannot touch production data.

## Local development

```bash
docker build -t pb -f apps/pocketbase/Dockerfile .
docker run --rm -p 8080:8080 -v "$PWD/.pb_data:/pb/pb_data" pb
```

Admin UI at `http://localhost:8080/_/`. The build context is the repo root — run
the command from there, not from this directory.
