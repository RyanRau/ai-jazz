# __APP_NAME__

__TITLE__ — served at `https://__FQDN__`.

> Replace this line with what the app actually does. This README is the app's
> documentation; the repo root only explains the framework around it.

## Shared auth, scaffolded for you

`App.tsx` already gates its content on sign-in — signed out, it shows a
`LoginForm`; signed in, it wraps your content in `AppShell` with an
`AccountMenu` in the account slot. This comes from a few files copied
verbatim from `infra/templates/app/src/*.tpl`, common to every app in this
repo (edit them locally if this app needs to deviate — they're not imported
from anywhere shared):

| File                 | What it does                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `CookieAuthStore.ts` | Persists the PocketBase auth token as a `.ryanzrau.dev`-scoped cookie instead of `localStorage`, so signing in on any app signs you into all of them. |
| `useAuth.ts`         | `useAuthRecord()` — the current signed-in user's record, or `null`, re-rendering on auth changes. |
| `LoginForm.tsx`      | A real login form built from bluestar's `useForm`/`Form` — kept out of bluestar itself since bluestar must not depend on the `pocketbase` package. |
| `AccountMenu.tsx`    | The avatar-pill dropdown (name/email, a link to the shared settings page at `ryanzrau.dev/settings`, log out) that goes in `AppShell`'s `account` slot. |

## Local development

```bash
cd apps/__APP_NAME__
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
- `development: true` routes it at `test-__SUBDOMAIN__` instead of the real
  subdomain — delete that line to promote it.
