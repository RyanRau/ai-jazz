/// <reference path="../pb_data/types.d.ts" />

// Household inventory. Sharing is view-only: shared_with grants read access
// (owner = @request.auth.id || shared_with.id ?= @request.auth.id) but only
// the owner may update/delete. The stash app's "who can I share with" picker
// is populated by a pb_hooks route (stash_shareable_users.pb.js), not by
// listing this collection or the users collection directly.
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;
    app.save(
      new Collection({
        type: "base",
        name: "stash_items",
        fields: [
          {
            type: "relation",
            name: "owner",
            collectionId: usersId,
            required: true,
            maxSelect: 1,
          },
          { type: "text", name: "name", required: true, max: 200 },
          { type: "text", name: "description", max: 1000 },
          // Not required: NumberField's "required" means non-zero, but a
          // quantity of 0 (ran out) is a legitimate value. The client always
          // sends an explicit number.
          { type: "number", name: "quantity", required: false },
          { type: "text", name: "location", max: 200 },
          {
            type: "relation",
            name: "shared_with",
            collectionId: usersId,
            required: false,
            maxSelect: 20,
          },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        listRule: "owner = @request.auth.id || shared_with.id ?= @request.auth.id",
        viewRule: "owner = @request.auth.id || shared_with.id ?= @request.auth.id",
        createRule: '@request.auth.id != "" && @request.auth.id = @request.body.owner',
        updateRule: "owner = @request.auth.id",
        deleteRule: "owner = @request.auth.id",
      })
    );
  },
  (app) => app.delete(app.findCollectionByNameOrId("stash_items"))
);
