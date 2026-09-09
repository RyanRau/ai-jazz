/// <reference path="../pb_data/types.d.ts" />

// Powers the "share with" picker in the stash app: returns the other users
// who already have a registry_grants row for the stash app, rather than
// exposing the users collection directly (its listRule only ever lets a
// user see their own record).
routerAdd(
  "GET",
  "/api/custom/stash/shareable-users",
  (e) => {
    const authRecord = e.requestInfo().auth;
    const stashApp = e.app.findFirstRecordByFilter("registry_apps", "slug = {:slug}", {
      slug: "stash",
    });
    const grants = e.app.findRecordsByFilter("registry_grants", "app = {:appId}", "", 0, 0, {
      appId: stashApp.id,
    });
    const users = grants
      .map((g) => g.get("user"))
      .filter((id) => id !== authRecord.id)
      .map((id) => e.app.findRecordById("users", id))
      .map((u) => ({ id: u.id, email: u.getString("email") }));
    return e.json(200, { users });
  },
  $apis.requireAuth()
);
