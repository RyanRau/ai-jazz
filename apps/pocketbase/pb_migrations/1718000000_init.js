/// <reference path="../pb_data/types.d.ts" />

// Baseline schema for the shared backend.
//
// Deliberately empty of app collections — every app owns its own collections in
// its own migration file (see this app's README). All this does is lock
// down the built-in `users` collection so the internet can't sign itself up.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null; // closed signup: superusers create accounts
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    app.save(users);
  }
);
