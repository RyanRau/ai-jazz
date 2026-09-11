/// <reference path="../pb_data/types.d.ts" />

// Cleans up any user who ended up with more than one active (non-revoked)
// default key. apps/tony/src/playgroundKey.ts used to silently mint a new
// default key every time a browser's local cache came up empty -- even if
// the user already had one from a previous browser, device, or a cleared
// cache -- so some users accumulated several. Keeps the oldest active
// default per user (the one most likely to still be cached and in use
// somewhere) and un-defaults the rest: they stay valid, ordinary keys, now
// revocable through the normal /keys/revoke route, rather than being
// deleted outright.
//
// Must run before 1789099510_llm_api_keys_one_default_index.js -- that
// migration's unique index creation fails outright if any duplicates still
// exist at the row level when it runs.
migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      "llm_api_keys",
      "is_default = true && revoked_at = ''",
      "created",
      0,
      0
    );
    const seenUsers = new Set();
    records.forEach((r) => {
      const userId = r.getString("user");
      if (seenUsers.has(userId)) {
        r.set("is_default", false);
        app.save(r);
      } else {
        seenUsers.add(userId);
      }
    });
  },
  (app) => {
    // Not meaningfully reversible -- which rows this un-defaulted isn't
    // recorded anywhere, and leaving them as ordinary keys is the safer
    // failure mode versus guessing wrong and re-marking the wrong row.
  }
);
