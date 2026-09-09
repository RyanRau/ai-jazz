/// <reference path="../pb_data/types.d.ts" />

// Adds an admin flag to the built-in `users` collection. Not load-bearing for
// access control today (see registry_apps_and_grants — that's superuser-gated
// via createRule/updateRule/deleteRule: null, operated through the Admin UI),
// this is a UI affordance for future use. Set it on your own account by hand
// in the Admin UI after this runs.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new BoolField({
        name: "is_admin",
        required: false, // BoolField required means "must always be true"
      })
    );
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("is_admin");
    app.save(users);
  }
);
