/// <reference path="../pb_data/types.d.ts" />

// Backs the tony dashboard (key management + usage, self-service with an
// admin override) and home-server/llm-gateway (key validation + usage
// reporting, service-account-only).
//
// llm_api_keys never stores a plaintext key -- POST /keys generates one,
// hashes it, and returns the plaintext exactly once in that response. Every
// other route only ever sees the hash or a short non-secret prefix.
//
// Every key belongs to the user who created it (the `user` field). An
// `is_admin` caller sees and can revoke every key and every usage row; a
// regular user only ever sees their own -- enforced here, not by a
// collection rule, since llm_api_keys/llm_usage_logs have no rules at all
// (superuser-only) and everything goes through these routes instead.
//
// The admin/service checks are inlined into each handler rather than shared
// via a top-level helper function -- PocketBase's JSVM does not reliably
// expose a `.pb.js` file's top-level function declarations inside its own
// routerAdd callbacks (ReferenceError at request time), so each callback
// must be fully self-contained. (Same fix as apps/pocketbase/pb_hooks/admin.pb.js.)

// Create a key for yourself. Body: { label, is_default? }. Returns the
// plaintext key once. is_default just marks the key as one the revoke route
// below will refuse to touch -- it's the caller's own key either way, so
// there's no privilege being granted, only a self-inflicted-footgun guard
// for the key apps/tony/src/playgroundKey.ts mints (see its is_default
// migration for why the Playground needs this).
routerAdd(
  "POST",
  "/api/custom/llm/keys",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const body = e.requestInfo().body;
    const label = (body.label || "").trim();
    if (!label) {
      throw new BadRequestError("label is required.");
    }

    const secret = "sk-" + $security.randomString(48);
    const collection = e.app.findCollectionByNameOrId("llm_api_keys");
    const record = new Record(collection, {
      user: auth.id,
      label: label,
      key_hash: $security.sha256(secret),
      key_prefix: secret.substring(0, 10),
      is_default: body.is_default === true,
    });
    e.app.save(record);

    return e.json(200, { id: record.id, label: label, key: secret });
  },
  $apis.requireAuth()
);

// List keys (no hash, ever). Admin: every key, with the owner's email
// attached. Otherwise: only your own.
routerAdd(
  "GET",
  "/api/custom/llm/keys",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }
    const isAdmin = auth.get("is_admin") === true;

    const filter = isAdmin ? "" : "user = {:userId}";
    const records = e.app.findRecordsByFilter("llm_api_keys", filter, "-created", 0, 0, {
      userId: auth.id,
    });
    const keys = records.map((r) => {
      const key = {
        id: r.id,
        label: r.getString("label"),
        key_prefix: r.getString("key_prefix"),
        created: r.getString("created"),
        revoked_at: r.getString("revoked_at"),
        last_used_at: r.getString("last_used_at"),
        is_default: r.getBool("is_default"),
      };
      if (isAdmin) {
        const owner = e.app.findRecordById("users", r.getString("user"));
        key.owner_email = owner.getString("email");
      }
      return key;
    });
    return e.json(200, { keys: keys });
  },
  $apis.requireAuth()
);

// Revoke a key. Body: { id }. Idempotent. Admin: any key. Otherwise: only
// your own. A default key (the Playground's auto-provisioned key) can't be
// revoked at all, admin included -- see the is_default migration.
routerAdd(
  "POST",
  "/api/custom/llm/keys/revoke",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const id = (e.requestInfo().body.id || "").trim();
    if (!id) {
      throw new BadRequestError("id is required.");
    }
    const record = e.app.findRecordById("llm_api_keys", id);
    const isAdmin = auth.get("is_admin") === true;
    if (!isAdmin && record.getString("user") !== auth.id) {
      throw new ForbiddenError("You don't own this key.");
    }
    if (record.getBool("is_default")) {
      throw new BadRequestError("The default key can't be revoked.");
    }
    if (!record.getString("revoked_at")) {
      record.set("revoked_at", new Date().toISOString());
      e.app.save(record);
    }
    return e.json(200, { id: record.id, revoked_at: record.getString("revoked_at") });
  },
  $apis.requireAuth()
);

// Rename a key. Body: { id, label }. Admin: any key. Otherwise: only your
// own -- same ownership check as revoke.
routerAdd(
  "POST",
  "/api/custom/llm/keys/rename",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const body = e.requestInfo().body;
    const id = (body.id || "").trim();
    const label = (body.label || "").trim();
    if (!id) {
      throw new BadRequestError("id is required.");
    }
    if (!label) {
      throw new BadRequestError("label is required.");
    }
    const record = e.app.findRecordById("llm_api_keys", id);
    const isAdmin = auth.get("is_admin") === true;
    if (!isAdmin && record.getString("user") !== auth.id) {
      throw new ForbiddenError("You don't own this key.");
    }
    record.set("label", label);
    e.app.save(record);
    return e.json(200, { id: record.id, label: record.getString("label") });
  },
  $apis.requireAuth()
);

// Usage rows for the tony dashboard. Admin: every row. Otherwise: only rows
// for keys you own. Optional ?key=<id> narrows to one key (still subject to
// the same ownership check).
routerAdd(
  "GET",
  "/api/custom/llm/usage",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }
    const isAdmin = auth.get("is_admin") === true;
    const keyId = (e.requestInfo().query["key"] || "").trim();

    if (keyId) {
      const keyRecord = e.app.findRecordById("llm_api_keys", keyId);
      if (!isAdmin && keyRecord.getString("user") !== auth.id) {
        throw new ForbiddenError("You don't own this key.");
      }
    }

    let filter = "";
    const params = {};
    if (keyId) {
      filter = "key = {:keyId}";
      params.keyId = keyId;
    } else if (!isAdmin) {
      filter = "key.user = {:userId}";
      params.userId = auth.id;
    }

    const records = e.app.findRecordsByFilter("llm_usage_logs", filter, "-created", 500, 0, params);
    const rows = records.map((r) => ({
      id: r.id,
      key: r.getString("key"),
      model: r.getString("model"),
      tokens_in: r.getInt("tokens_in"),
      tokens_out: r.getInt("tokens_out"),
      created: r.getString("created"),
    }));
    return e.json(200, { usage: rows });
  },
  $apis.requireAuth()
);

// Gateway-facing: the active (non-revoked) key hashes, for the gateway's
// local validation cache. Never returns key_prefix/label -- the gateway
// only needs hash -> id, plus the owning user id so it can attribute
// anything it creates on a caller's behalf (e.g. chat rows) to the right
// person.
routerAdd(
  "GET",
  "/api/custom/llm/keys/active",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const records = e.app.findRecordsByFilter("llm_api_keys", "revoked_at = ''", "", 0, 0);
    const keys = records.map((r) => ({
      id: r.id,
      key_hash: r.getString("key_hash"),
      user: r.getString("user"),
    }));
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
