/// <reference path="../pb_data/types.d.ts" />

// Backs hub's /admin access-control matrix. registry_grants' create/update/
// deleteRule are all `null` (superuser-only) and `users`' listRule only ever
// lets a caller see their own record, so an admin needs a privileged route
// to read the full user/app/grant picture and to toggle grants -- these two
// routes are that route, gated the same way every other admin-only handler
// in this repo is (auth.get("is_admin") !== true), inlined per-handler since
// PocketBase's JSVM does not reliably expose a `.pb.js` file's top-level
// function declarations inside its own routerAdd callbacks.

// The full matrix: every user, every app, and the existing grants between
// them.
routerAdd(
  "GET",
  "/api/custom/admin/access",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const userRecords = e.app.findRecordsByFilter("users", "", "email", 0, 0);
    const users = userRecords.map((u) => ({
      id: u.id,
      email: u.getString("email"),
      name: u.getString("name"),
    }));

    const appRecords = e.app.findRecordsByFilter("registry_apps", "", "name", 0, 0);
    const apps = appRecords.map((a) => ({
      id: a.id,
      slug: a.getString("slug"),
      name: a.getString("name"),
    }));

    const grantRecords = e.app.findRecordsByFilter("registry_grants", "", "", 0, 0);
    const grants = grantRecords.map((g) => ({
      user: g.getString("user"),
      app: g.getString("app"),
    }));

    return e.json(200, { users: users, apps: apps, grants: grants });
  },
  $apis.requireAuth()
);

// Toggle a single grant. Body: { user, app, granted }. Idempotent either way.
routerAdd(
  "POST",
  "/api/custom/admin/access",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const body = e.requestInfo().body;
    const userId = (body.user || "").trim();
    const appId = (body.app || "").trim();
    if (!userId || !appId) {
      throw new BadRequestError("user and app are required.");
    }

    // findFirstRecordByFilter throws (rather than returning null) when no
    // row matches, so "does a grant already exist" has to go through
    // try/catch instead of a truthiness check.
    let existing = null;
    try {
      existing = e.app.findFirstRecordByFilter(
        "registry_grants",
        "user = {:userId} && app = {:appId}",
        { userId: userId, appId: appId }
      );
    } catch (err) {
      existing = null;
    }

    if (body.granted) {
      if (!existing) {
        const collection = e.app.findCollectionByNameOrId("registry_grants");
        const record = new Record(collection, { user: userId, app: appId });
        e.app.save(record);
      }
    } else if (existing) {
      e.app.delete(existing);
    }

    return e.json(200, { ok: true });
  },
  $apis.requireAuth()
);
