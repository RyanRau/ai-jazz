/// <reference path="../pb_data/types.d.ts" />

// API keys for home-server/llm-gateway, and usage accounting for them.
//
// Both collections are superuser-only via unset rules -- every read/write
// goes through pb_hooks/llm.pb.js instead, so:
//   - a plaintext key is only ever generated server-side and returned once
//     in the creation response; only its SHA-256 hash and a short display
//     prefix are ever stored.
//   - usage rows carry model + token counts only, never request/response
//     content.
migrate(
  (app) => {
    const keys = new Collection({
      type: "base",
      name: "llm_api_keys",
      fields: [
        { type: "text", name: "label", required: true, max: 100 },
        { type: "text", name: "key_hash", required: true, max: 64 },
        { type: "text", name: "key_prefix", required: true, max: 12 },
        { type: "date", name: "revoked_at" },
        { type: "date", name: "last_used_at" },
        { type: "autodate", name: "created", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_llm_api_keys_hash ON llm_api_keys (key_hash)"],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(keys);

    app.save(
      new Collection({
        type: "base",
        name: "llm_usage_logs",
        fields: [
          {
            type: "relation",
            name: "key",
            collectionId: keys.id,
            required: true,
            maxSelect: 1,
          },
          { type: "text", name: "model", required: true, max: 100 },
          { type: "number", name: "tokens_in", required: true, min: 0 },
          { type: "number", name: "tokens_out", required: true, min: 0 },
          { type: "autodate", name: "created", onCreate: true },
        ],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("llm_usage_logs"));
    app.delete(app.findCollectionByNameOrId("llm_api_keys"));
  }
);
