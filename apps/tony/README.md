# tony

Dashboard for the home-lab LLM setup — served at `https://tony.ryanzrau.dev`.
Talks to [`home-server/llm-gateway`](../../home-server/llm-gateway/README.md)
(one-off prompts) and PocketBase (`registry_apps`/`registry_grants` for
access, plus API key + usage tracking once that lands).

## Local development

```bash
cd apps/tony
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
- `development: true` routes it at `test-tony` instead of the real
  subdomain — delete that line to promote it.

## History

Renamed from `llm` (formerly `https://llm.ryanzrau.dev`); the `registry_apps`
catalog entry was updated in place (migration
`1788918230_rename_llm_app_to_tony.js`) rather than recreated, so existing
`registry_grants` records keep working unchanged.
