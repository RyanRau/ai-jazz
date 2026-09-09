/// <reference path="../pb_data/types.d.ts" />

// Ties each llm_api_keys row to the user who created it, so pb_hooks/llm.pb.js
// can scope the tony dashboard's key/usage views: an admin sees every key and
// every usage row, a regular user sees only their own.
migrate(
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    const usersId = app.findCollectionByNameOrId("users").id;
    keys.fields.add(
      new RelationField({
        name: "user",
        collectionId: usersId,
        required: true,
        maxSelect: 1,
      })
    );
    app.save(keys);
  },
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    keys.fields.removeByName("user");
    app.save(keys);
  }
);
