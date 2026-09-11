# ryanzrau

The personal site at [ryanzrau.dev](https://ryanzrau.dev) — the root-domain app
(`subdomain: ""` in the repo-root `deploy.yml`).

`Landing.tsx` — a warm "nature journal" personal-site page (bio, experience,
skills, personal projects, hobbies) that intentionally sits outside
bluestar's dashboard look — is the root path either way, signed in or out.
Signed out, the top-right pill opens a `LoginForm` modal; signed in, it's a
plain "Welcome, {name}" label instead, and a hamburger appears in the
top-left corner (icon-only; hovering just outlines it, no label) that opens
the dashboard nav (Home, Apps, Admin, Settings, account) in a `Drawer`
overlay instead of a permanent sideNav rail — the home page should read as
ryanzrau.dev's home, not as dashboard chrome, even for the signed-in owner.
The drawer reuses the exact same `SideNav` instance `/apps`, `/admin`, and
`/settings` render inside `AppShell`'s own rail (a "Home" item there just
links back to `/`), wrapped in bluestar's (now-exported)
`SideNavMobileContext` so it renders full-width and non-collapsible, the
same way `AppShell`'s own mobile drawer does — those three paths are
otherwise unchanged. It carries no "Menu"/"Navigation" heading of its own
(bluestar's `Drawer` takes an optional `title` now, for exactly this); the
`SideNav` content — `AppSwitcher`'s own brand row at the top — reads as if
it were just there, the same chrome-less look `AppShell`'s own mobile drawer
already had.

`AppSwitcher.tsx` draws a real icon per entry (`appIcons.tsx`'s per-slug set
for a registry app, bluestar's `grid` icon for the built-in "Apps" catalog
link) instead of `registry_apps`' emoji, and a small "R" monogram badge as
this app's own brand mark — shown beside "Ryan Rau" when the rail is
expanded, and alone, via `SideNav`'s new `collapsedTop`, in the rail's
"brand spot" when collapsed (a plain badge rather than reusing an icon like
`home`, since the "Home" nav item right below it already owns that glyph —
two identical icons stacked with nothing to distinguish them read as a
rendering mistake, not branding).

The Personal Projects section fetches `GET /api/custom/public-apps`
(`apps/pocketbase/pb_hooks/registry_public.pb.js`) — the subset of
PocketBase's `registry_apps` collection marked `public: true`
(`apps/pocketbase/pb_migrations/1789099600_registry_apps_public.js`). This is
the same catalog that backs the signed-in Apps dashboard, which fetches the
full (auth-gated) collection directly instead. Both pages draw the same
custom SVG icon per app slug (`appIcons.tsx`) rather than the emoji
`registry_apps` itself stores — a slug with no matching icon falls back to a
generic mark. Mark a new app public in the Admin UI (`registry_apps` → the
app's row → `public`) to add it to the home page too.

`theme.ts` re-colors bluestar to match Landing's palette (warm cream/clay/
sage, Bitter/Karla type) for this app's own `AppShell` pages (`/apps`,
`/admin`, `/settings`, and the signed-in home drawer) — passed to
`ThemeProvider`'s `theme`/`darkTheme` props in `main.tsx`. It's colors and
fonts only, deep-merged over bluestar's own `defaultTheme`/`darkTheme`; no
bluestar component changed shape or gained a variant, and stash/tony keep
bluestar's stock look since each app's `ThemeProvider` is independent.

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
