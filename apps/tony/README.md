# tony

Dashboard for the home-lab LLM setup — served at `https://tony.ryanzrau.dev`.
A side nav switches between two pages:

- **Playground** — sends a one-off chat completion straight to the gateway
  (`VITE_LLM_GATEWAY_URL`, default `https://llm.ryanzrau.dev`) from the
  browser, the same as any other API client. Uses a personal key created
  automatically the first time a user visits (`src/playgroundKey.ts`) —
  nothing to paste in. It's a real key like any other (created via the same
  self-service route the Keys page uses, just triggered for the user rather
  than by them), cached client-side in `localStorage` scoped by user id, and
  shows up on the Keys page as `"Tony Playground (auto)"`, marked default so
  it can't be revoked out from under this page. If the cached key stops
  working (cache cleared elsewhere), the page mints a fresh one and retries
  once rather than surfacing an auth error for a key the user never typed in
  themselves. The model field is a dropdown populated from the gateway's own
  `GET /v1/models` once the key is ready, falling back to a plain text field
  if the gateway can't be reached; picking a model the gateway reports as
  vision-capable enables an image attachment field, sent as an `image_url`
  content part alongside the prompt. Until the WireGuard tunnel exists,
  sending will fail to reach the gateway — that's expected, not a bug in
  this page.
- **Keys** — create/revoke API keys and see both per-key and aggregate usage
  (call count, tokens in/out, a daily time-series chart) in one place, with
  a dropdown to scope the usage section to one key or "All keys". Backed by
  `apps/pocketbase/pb_hooks/llm.pb.js`: an `is_admin` account sees and can
  revoke every key across every user; anyone else only ever sees their own.
  A key's plaintext is shown exactly once, at creation — the server never
  stores it, only its hash. The Playground's auto-provisioned key is marked
  `is_default` and has no Revoke button — the route refuses to revoke it
  even for an admin, since there'd be no way for the Playground to recover
  (a `1788989340`/`1788992030` migration pair adds the field and backfills
  it onto keys that were minted before it existed). Revoking is a soft
  delete: the key drops out of the table and usage dropdown, but a "Show
  revoked keys" toggle brings it (and its usage) back into view rather than
  deleting the row. The usage stats and chart are built on bluestar's
  `StatTile` and `LineChart`.

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
