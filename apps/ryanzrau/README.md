# ryanzrau

The personal site at [ryanzrau.dev](https://ryanzrau.dev) — the root-domain app
(`subdomain: ""` in the repo-root `deploy.yml`).

The site's `AppShell` header (title left, an account control right) is
present whether or not you're signed in — signed out, the right slot holds a
"Sign in" button that opens a `LoginForm` modal; signed in, it's the same
`AccountMenu` every other app uses. Either way the page body is just a short
welcome message — there's no app-specific content or data yet beyond auth.

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
