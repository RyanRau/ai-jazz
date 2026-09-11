/// <reference path="../pb_data/types.d.ts" />

// Enforces "at most one active default key per user" at the database level.
// pb_hooks/llm.pb.js's POST /keys route, plus its onRecordCreate/
// onRecordUpdate hooks, already refuse to create or update a row into a
// second one -- this is the backstop that holds even for a write path those
// miss (a future route, a direct edit in the admin UI). SQLite partial
// index: only rows matching the WHERE clause count toward the uniqueness
// check, so any number of non-default or revoked keys per user is still
// fine -- just not a second *active default* one.
//
// Must run after 1789099500_llm_api_keys_dedupe_defaults.js -- creating this
// index over pre-existing duplicates fails outright, since SQLite validates
// a UNIQUE index against the current data as part of creating it.
migrate(
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    keys.indexes = [
      ...keys.indexes,
      "CREATE UNIQUE INDEX idx_llm_api_keys_one_default_per_user ON llm_api_keys (user) WHERE is_default = 1 AND revoked_at = ''",
    ];
    app.save(keys);
  },
  (app) => {
    const keys = app.findCollectionByNameOrId("llm_api_keys");
    keys.indexes = keys.indexes.filter(
      (idx) => idx.indexOf("idx_llm_api_keys_one_default_per_user") === -1
    );
    app.save(keys);
  }
);
