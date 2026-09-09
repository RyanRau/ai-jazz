# stash

Household inventory — served at `https://stash.ryanzrau.dev`.

Add items (name, quantity, location) to the shared `stash_items` collection.
Each item is owner-scoped by default; the owner can share view access to
specific other granted users via the "Share" action, which lists everyone
else with a `registry_grants` entry for stash (fetched from the
`/api/custom/stash/shareable-users` PocketBase hook) and writes their ids into
the item's `shared_with` field.

## Local development

```bash
cd apps/stash
npm install          # also builds the bluestar file: dependency
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
```

Point the app at a local backend instead of production with a `.env.local`:

```
VITE_PB_URL=http://localhost:8080
```

After changing `packages/bluestar`, rebuild it (`npm run build` in
`packages/bluestar`) so this app picks the changes up.

## Stack

- **React + TypeScript + Vite**
- **[bluestar](../../packages/bluestar)** for UI — see `packages/PACKAGES.md` for
  the component API. Add missing primitives to bluestar rather than building
  one-off components here.
- **PocketBase** for auth and data via `src/pb.ts` — collections live in
  `apps/pocketbase/pb_migrations`.

## Deployment

Registered in the repo-root `deploy.yml`; pushing to `main` builds and ships it.
Nginx and container config live in this directory (`Dockerfile`, `nginx.conf`).

- `enabled: false` takes it offline.
- `development: true` routes it at `test-stash` instead of the real
  subdomain — delete that line to promote it.
