# hub

The cross-app dashboard — served at `https://hub.ryanzrau.dev`.

Signed-in users see a grid of the apps they've been granted access to (via
`registry_grants`, superuser-managed from the PocketBase admin UI — there's no
in-app way to grant access yet). hub also hosts the one shared account
**settings page** at `/settings` (name, avatar upload, password change) —
every other app's account menu links out to it here rather than each app
building its own copy.

## Local development

```bash
cd apps/hub
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
  `apps/pocketbase/pb_migrations`. The settings page's password change
  re-authenticates immediately after a successful update, since PocketBase
  invalidates the current session token on any password change (even to the
  same value) — see the comment above that call in `src/SettingsPage.tsx`.

## Deployment

Registered in the repo-root `deploy.yml`; pushing to `main` builds and ships it.
Nginx and container config live in this directory (`Dockerfile`, `nginx.conf`).

- `enabled: false` takes it offline.
- `development: true` routes it at `test-hub` instead of the real
  subdomain — delete that line to promote it.
