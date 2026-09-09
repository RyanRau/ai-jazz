/// <reference path="../pb_data/types.d.ts" />

// Backs the tony dashboard (key management, admin-only) and home-server/
// llm-gateway (key validation + usage reporting, service-account-only).
//
// llm_api_keys never stores a plaintext key -- POST /keys generates one,
// hashes it, and returns the plaintext exactly once in that response. Every
// other route only ever sees the hash or a short non-secret prefix.
//
// The admin/service checks are inlined into each handler rather than shared
// via a top-level helper function -- PocketBase's JSVM does not reliably
// expose a `.pb.js` file's top-level function declarations inside its own
// routerAdd callbacks (ReferenceError at request time), so each callback
// must be fully self-contained.

// Create a key. Body: { label }. Returns the plaintext key once.
routerAdd(
  "POST",
  "/api/custom/llm/keys",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const body = e.requestInfo().body;
    const label = (body.label || "").trim();
    if (!label) {
      throw new BadRequestError("label is required.");
    }

    const secret = "sk-" + $security.randomString(48);
    const collection = e.app.findCollectionByNameOrId("llm_api_keys");
    const record = new Record(collection, {
      label: label,
      key_hash: $security.sha256(secret),
      key_prefix: secret.substring(0, 10),
    });
    e.app.save(record);

    return e.json(200, { id: record.id, label: label, key: secret });
  },
  $apis.requireAuth()
);

// List keys (no hash, ever).
routerAdd(
  "GET",
  "/api/custom/llm/keys",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const records = e.app.findRecordsByFilter("llm_api_keys", "", "-created", 0, 0);
    const keys = records.map((r) => ({
      id: r.id,
      label: r.getString("label"),
      key_prefix: r.getString("key_prefix"),
      created: r.getString("created"),
      revoked_at: r.getString("revoked_at"),
      last_used_at: r.getString("last_used_at"),
    }));
    return e.json(200, { keys: keys });
  },
  $apis.requireAuth()
);

// Revoke a key. Body: { id }. Idempotent.
routerAdd(
  "POST",
  "/api/custom/llm/keys/revoke",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const id = (e.requestInfo().body.id || "").trim();
    if (!id) {
      throw new BadRequestError("id is required.");
    }
    const record = e.app.findRecordById("llm_api_keys", id);
    if (!record.getString("revoked_at")) {
      record.set("revoked_at", new Date().toISOString());
      e.app.save(record);
    }
    return e.json(200, { id: record.id, revoked_at: record.getString("revoked_at") });
  },
  $apis.requireAuth()
);

// Gateway-facing: the active (non-revoked) key hashes, for the gateway's
// local validation cache. Never returns key_prefix/label -- the gateway
// only needs hash -> id.
routerAdd(
  "GET",
  "/api/custom/llm/keys/active",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const records = e.app.findRecordsByFilter("llm_api_keys", "revoked_at = ''", "", 0, 0);
    const keys = records.map((r) => ({ id: r.id, key_hash: r.getString("key_hash") }));
    return e.json(200, { keys: keys });
  },
  $apis.requireAuth()
);

// Gateway-facing: batched usage rows. Body: { rows: [{ key_id, model,
// tokens_in, tokens_out }] }. Also bumps the key's last_used_at.
routerAdd(
  "POST",
  "/api/custom/llm/usage",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const rows = e.requestInfo().body.rows || [];
    const usageCollection = e.app.findCollectionByNameOrId("llm_usage_logs");
    const now = new Date().toISOString();

    rows.forEach((row) => {
      const usage = new Record(usageCollection, {
        key: row.key_id,
        model: row.model,
        tokens_in: row.tokens_in || 0,
        tokens_out: row.tokens_out || 0,
      });
      e.app.save(usage);

      const keyRecord = e.app.findRecordById("llm_api_keys", row.key_id);
      keyRecord.set("last_used_at", now);
      e.app.save(keyRecord);
    });

    return e.json(200, { saved: rows.length });
  },
  $apis.requireAuth()
);
