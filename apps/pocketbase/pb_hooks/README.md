# pb_hooks

Custom server-side routes and event hooks for the shared backend. PocketBase
loads every `*.pb.js` file in this directory into its embedded JS (goja) VM at
startup — this README is ignored, and only exists so the directory stays tracked
in git.

## Adding a route

Create `<feature>.pb.js`. Namespace routes under `/api/custom/` so they never
collide with PocketBase's generated collection API, and require auth unless the
endpoint is genuinely public.

```js
/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "GET",
  "/api/custom/<feature>",
  (e) => {
    const rec = e.app.findRecordById("<collection>", e.requestInfo().query["id"]);
    return e.json(200, { label: rec.getString("label") });
  },
  $apis.requireAuth()
);
```

Useful globals inside a hook: `e.app` (database access), `e.requestInfo()`
(query/body/auth record), `$http.send()` (outbound HTTP), `$apis.requireAuth()`
and `$apis.requireSuperuserAuth()` (middleware).

## When _not_ to put logic here

goja is not Node — no npm packages, no async/await ergonomics. Use hooks for thin
computed endpoints. Anything with multi-step orchestration or real dependencies
belongs in its own app that authenticates to PocketBase over HTTP.

Hooks are baked into the image, so changes ship on the next deploy.
