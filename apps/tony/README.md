# tony

Dashboard for the home-lab LLM setup — served at `https://tony.ryanzrau.dev`.
A side nav switches between two pages:

- **Playground** — sends a one-off chat completion straight to the gateway
  (`VITE_LLM_GATEWAY_URL`, default `https://llm.ryanzrau.dev`) from the
  browser, the same as any other API client. Needs a key from the Keys page
  and (until the WireGuard tunnel exists) will fail to reach the gateway —
  that's expected, not a bug in this page.
- **Keys** — create/revoke API keys and see per-key usage (call count,
  tokens in/out). Backed by `apps/pocketbase/pb_hooks/llm.pb.js`: an
  `is_admin` account sees and can revoke every key across every user; anyone
  else only ever sees their own. A key's plaintext is shown exactly once, at
  creation — the server never stores it, only its hash.

Auth and data both go through PocketBase (`registry_apps`/`registry_grants`
for who can open the app at all; `llm_api_keys`/`llm_usage_logs` for the Keys
page). See [`home-server/llm-gateway`](../../home-server/llm-gateway/README.md)
for how the gateway itself validates keys and reports usage back.

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
VITE_LLM_GATEWAY_URL=http://127.0.0.1:8000   # only needed to test the Playground locally
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
