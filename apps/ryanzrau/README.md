# ryanzrau

The personal site at [ryanzrau.dev](https://ryanzrau.dev) — the root-domain app
(`subdomain: ""` in the repo-root `deploy.yml`).

Signed out, visitors get `Landing.tsx` — a warm "nature journal" personal-site
page (bio, experience, skills, personal projects, hobbies) that intentionally
sits outside bluestar's dashboard look; a "Sign in" control opens a
`LoginForm` modal. Signed in, the `AppShell` sidebar (Apps, Settings, Admin)
takes over and the root path shows a short dashboard welcome instead.

The Personal Projects section fetches `GET /api/custom/public-apps`
(`apps/pocketbase/pb_hooks/registry_public.pb.js`) — the subset of
PocketBase's `registry_apps` collection marked `public: true`
(`apps/pocketbase/pb_migrations/1789099600_registry_apps_public.js`). This is
the same catalog that backs the signed-in Apps dashboard; `registry_apps`
itself still requires auth to read (`listRule`), so this route serves just
the public rows without loosening that. The landing page draws its own
custom SVG icon per app slug (`projectIcons` in `Landing.tsx`) rather than
reusing the emoji `registry_apps` stores for the dashboard — a slug with no
matching icon falls back to a generic mark. Mark a new app public in the
Admin UI (`registry_apps` → the app's row → `public`) to add it here.

## Local development

```bash
npm run bootstrap            # once per clone, from the repo root: builds bluestar
cd apps/ryanzrau
npm install
npm run dev                  # http://localhost:5173
npm run build                # type-check + production build into dist/
```

After changing `packages/bluestar`, rebuild it (`npm --prefix packages/bluestar run build`)
so this app picks up the change — apps import bluestar's `dist/`, not its source.

## Stack

React + TypeScript + Vite, with [bluestar](../../packages/bluestar) for UI.
It authenticates against the shared PocketBase backend the same way every
other app does (`src/pb.ts`, `src/useAuth.ts`, `src/CookieAuthStore.ts` — a
hand-copy of `infra/templates/app`'s auth files, predating the scaffolder),
but has no collection of its own yet; if it needs data, add one the same way
scaffolded apps do (see `apps/pocketbase/README.md`).

## Deployment

Built by the two-stage `Dockerfile` here (bluestar → app → nginx) and served by
`nginx.conf`. Pushing to `main` builds and deploys it.
