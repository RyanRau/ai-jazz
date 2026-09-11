# tony

Dashboard for the home-lab LLM setup — served at `https://tony.ryanzrau.dev`.
A side nav switches between four pages:

- **Chat** — persistent, multi-turn conversations, backed by
  `apps/pocketbase/pb_hooks/chat.pb.js` and gateway.py's `/v1/chat/send`.
  Recent chats live in the side nav itself: the "Chat" item's
  `expandedContent` (`src/ChatHistoryList.tsx`) shows the 5 most recent
  chats and a "Show all chats" row, toggled independently of navigation by
  a trailing chevron; a separate "New chat" `action` on the row itself (a
  small `+` icon button, next to the chevron) starts a new thread without
  requiring the section to be expanded first — see `packages/PACKAGES.md`
  on why an item's own `expandedContent`, not a separate page-level panel,
  is where a page's short list of things to jump to belongs, and why it's
  capped rather than unbounded (the full list is `src/AllChatsPage.tsx`,
  one click away). The thread itself is
  `src/ChatPage.tsx`; all three share one `src/useChat.ts` instance, created
  once in `App.tsx`. Generation runs as a background task independent of
  the browser tab (see `_generate_chat_response` in the gateway), so a
  message keeps going and gets saved even if you close it; replies render
  as markdown (`bluestar`'s `Markdown`/`ChatBubble`), code blocks included.
  The composer sends on Enter and inserts a newline on Shift+Enter
  (`TextAreaInput`'s `onKeyDown` passthrough); every message shows its own
  timestamp (`formatMessageTime` in `usageHelpers.ts` — just the time for
  today, a short date for anything older) alongside token in/out and
  elapsed time for a completed assistant reply. A web-search tool call
  (when `web_search.searxng_url` is configured on the gateway) shows up
  under its message as a `Disclosure` — "N tools used", collapsed by
  default — rather than an always-open block, since the query/results are
  useful to check but not something worth taking up space by default.
- **Playground** — sends a one-off chat completion straight to the gateway
  (`VITE_LLM_GATEWAY_URL`, default `https://llm.ryanzrau.dev`) from the
  browser, the same as any other API client. Model is a dropdown populated
  from the gateway's own `GET /v1/models` once a key is ready, falling back
  to a plain text field if the gateway can't be reached; picking a
  vision-capable model enables an image attachment field, sent as an
  `image_url` content part. Exposes dedicated controls for the common
  sampling params (temperature, max tokens, top P) plus an **Advanced
  params** JSON field that merges arbitrary extra fields into the request
  body — anything a given `llama-server` build accepts (`reasoning_budget`,
  `min_p`, `seed`, ...) passes straight through with no gateway change
  needed, since gateway.py forwards the body almost untouched. A **Stream
  response** toggle reads the reply as SSE instead of waiting for the whole
  completion (the gateway already supports this for `/v1/chat/completions`;
  see its README). See the **Docs** page for the full parameter reference.
- **Keys** — create/revoke API keys and see both per-key and aggregate usage
  (call count, tokens in/out, a daily time-series chart) in one place, with
  a dropdown to scope the usage section to one key or "All keys". Backed by
  `apps/pocketbase/pb_hooks/llm.pb.js`: an `is_admin` account sees and can
  revoke every key across every user; anyone else only ever sees their own.
  A key's plaintext is shown exactly once, at creation — the server never
  stores it, only its hash. Chat and Playground don't hold a key
  client-side at all: they authenticate to the gateway with the signed-in
  user's own PocketBase session token (`src/useGatewayAuth.ts`), which the
  gateway resolves server-side to a personal _default_ `llm_api_keys` row it
  auto-provisions on first use (`POST /api/custom/llm/keys/default` in
  `llm.pb.js`) — shown on this page as `"Tony Playground (auto)"`, with no
  Revoke button, since the route refuses to revoke a default key even for an
  admin. Because it's driven by your PocketBase login rather than a
  client-cached secret, it's already there on every browser/device the
  moment you're signed in — nothing to create, and nothing that can be lost
  by clearing one browser's storage (a real gap in the old
  localStorage-cached-key design, which had no way to recover a lost
  default's plaintext and no fallback once it was gone). The server refuses
  a second active default per user regardless of entry point (checked in
  `llm.pb.js`'s POST /keys and POST /keys/default routes, its
  `onRecordCreate`/`onRecordUpdate` hooks, and a partial unique index — see
  migration `1789099510_llm_api_keys_one_default_index.js`). Revoking any
  other key is a soft delete: it drops out of the table and usage dropdown,
  but a "Show revoked keys" toggle brings it (and its usage) back into view
  rather than deleting the row. The usage stats and chart are built on
  bluestar's `StatTile` and `LineChart`.
- **Docs** (`src/DocsPage.tsx`) — the gateway's request/response reference
  (parameters, streaming, images) rendered as markdown via `bluestar`'s
  `Markdown` component, the same one Chat/Playground use for replies. Plain
  markdown content in the file itself — no CMS round-trip for a page one
  person maintains.

Auth and data both go through PocketBase (`registry_apps`/`registry_grants`
for who can open the app at all; `llm_api_keys`/`llm_usage_logs` for the Keys
page). See [`home-server/llm-gateway`](../../home-server/llm-gateway/README.md)
for how the gateway itself validates keys, reports usage back, and forwards
request parameters to `llama-server`.

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
