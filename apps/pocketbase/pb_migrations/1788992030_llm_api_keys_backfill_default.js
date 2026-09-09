/// <reference path="../pb_data/types.d.ts" />

// Backfills is_default on keys that were auto-provisioned for the
// Playground before is_default existed (see
// 1788989340_llm_api_keys_is_default.js). Without this, the revoke guard
// pb_hooks/llm.pb.js added only protects a key minted *after* that
// migration shipped -- the key that was already keeping someone's
// Playground working stays revocable, since its row predates the field and
// defaults to false like any other key.
//
// Matches on the exact label apps/tony/src/playgroundKey.ts's LABEL
// constant sets ("Tony Playground (auto)") -- the only signal available
// for a row created before is_default existed to record what it's for.
migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      "llm_api_keys",
      "label = {:label} && revoked_at = ''",
      "",
      0,
      0,
      { label: "Tony Playground (auto)" }
    );
    records.forEach((r) => {
      r.set("is_default", true);
      app.save(r);
    });
  },
  (app) => {
    // Not meaningfully reversible -- we don't know which of these rows
    // were already is_default before this ran, and leaving them protected
    // is the safer failure mode (a real Playground key stays un-revocable)
    // versus the alternative (a Playground key becomes revocable again).
  }
);
