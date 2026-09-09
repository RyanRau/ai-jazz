/// <reference path="../pb_data/types.d.ts" />

// Marks a users row as a machine/service account (e.g. the llm-gateway),
// distinct from is_admin (a human with dashboard admin rights). Checked in
// pb_hooks/llm.pb.js to gate the gateway-only routes without granting those
// accounts admin power over anything else. Set it on the service account by
// hand in the Admin UI after creating it -- see apps/pocketbase/README.md.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new BoolField({
        name: "is_service",
        required: false, // BoolField required means "must always be true"
      })
    );
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("is_service");
    app.save(users);
  }
);
