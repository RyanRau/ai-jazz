# ryanzrau

The personal site at [ryanzrau.dev](https://ryanzrau.dev) — the root-domain app
(`subdomain: ""` in the repo-root `deploy.yml`).

Signed out, visitors get `Landing.tsx` — a warm "nature journal" personal-site
page (bio, experience, skills, personal projects, hobbies) that intentionally
sits outside bluestar's dashboard look; a "Sign in" control opens a
`LoginForm` modal. Signed in, the `AppShell` sidebar (Apps, Settings, Admin)
takes over and the root path shows a short dashboard welcome instead.

The Personal Projects list on the landing page is currently static sample
data (Stash, Tony, Bluestar), mirroring what's in PocketBase's `registry_apps`
collection — the same catalog that backs the signed-in Apps dashboard. Wiring
it to that collection for real needs a public-readable subset (`registry_apps`
today requires auth to read); the plan is a `public` boolean field plus a
`pb_hooks` route that serves just the public rows, so the dashboard keeps
reading the full authenticated collection unchanged.

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
