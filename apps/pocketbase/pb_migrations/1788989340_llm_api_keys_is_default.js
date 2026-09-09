/// <reference path="../pb_data/types.d.ts" />

// Marks a key as the one auto-provisioned for the Playground (see
// apps/tony/src/playgroundKey.ts). pb_hooks/llm.pb.js's revoke route refuses
// to revoke a default key -- without one, the Playground would 401 with no
// way for the page to recover (its own retry-once-with-a-fresh-key path only
// covers a key revoked *after* it was minted, not "there is no key at all").
migrate(
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    keys.fields.add(
      new BoolField({
        name: "is_default",
        required: false, // BoolField required means "must always be true"
      })
    );
    app.save(keys);
  },
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    keys.fields.removeByName("is_default");
    app.save(keys);
  }
);
