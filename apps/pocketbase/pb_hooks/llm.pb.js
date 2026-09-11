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
// for the key POST /keys/default below auto-provisions. At most one active
// default per user is allowed -- checked here for a clean error message,
// backstopped regardless of entry point by the onRecordCreate/onRecordUpdate
// hooks below and, at the database level, by a unique index (see migration
// 1789099510_llm_api_keys_one_default_index.js).
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
    const isDefault = body.is_default === true;
    if (isDefault) {
      const existingDefaults = e.app.findRecordsByFilter(
        "llm_api_keys",
        "user = {:userId} && is_default = true && revoked_at = ''",
        "",
        1,
        0,
        { userId: auth.id }
      );
      if (existingDefaults.length > 0) {
        throw new BadRequestError("You already have a default key.");
      }
    }

    const secret = "sk-" + $security.randomString(48);
    const collection = e.app.findCollectionByNameOrId("llm_api_keys");
    const record = new Record(collection, {
      user: auth.id,
      label: label,
      key_hash: $security.sha256(secret),
      key_prefix: secret.substring(0, 10),
      is_default: isDefault,
    });
    e.app.save(record);

    return e.json(200, { id: record.id, label: label, key: secret });
  },
  $apis.requireAuth()
);

// Get-or-create your own default key, without ever returning its plaintext
// or hash -- just its id. Called by the gateway, which forwards the
// caller's own bearer token here (so this authenticates as an ordinary
// user session via $apis.requireAuth(), not the service account) to turn a
// live PocketBase login into something it can log usage against. This is
// what lets Chat/Playground work from any signed-in browser with nothing
// to mint or cache client-side: every device already has a working
// PocketBase session (auto-refreshed, shared cross-subdomain via the auth
// cookie -- see apps/tony/src/pb.ts/CookieAuthStore.ts), so there's no
// separate "Playground key" for the client to lose or need to recover.
// Auto-provisions on first call exactly like POST /keys with
// is_default: true, just without a client ever seeing the secret it
// generates -- nothing outside this handler needs it.
routerAdd(
  "POST",
  "/api/custom/llm/keys/default",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const existing = e.app.findRecordsByFilter(
      "llm_api_keys",
      "user = {:userId} && is_default = true && revoked_at = ''",
      "",
      1,
      0,
      { userId: auth.id }
    );
    if (existing.length > 0) {
      return e.json(200, { key_id: existing[0].id, user_id: auth.id });
    }

    const secret = "sk-" + $security.randomString(48);
    const collection = e.app.findCollectionByNameOrId("llm_api_keys");
    const record = new Record(collection, {
      user: auth.id,
      label: "Tony Playground (auto)",
      key_hash: $security.sha256(secret),
      key_prefix: secret.substring(0, 10),
      is_default: true,
    });
    e.app.save(record);

    return e.json(200, { key_id: record.id, user_id: auth.id });
  },
  $apis.requireAuth()
);

// List keys (no hash, ever). Admin: every key, with the owner's email
// attached -- unless ?mine=true forces it back down to just their own,
// the same escape hatch GET /usage has and for the same reason: an
// admin's own keys aren't otherwise distinguishable inside an unscoped
// list of everyone's, so the Keys page defaults here too. Otherwise
// (non-admin): always just your own, ?mine ignored.
routerAdd(
  "GET",
  "/api/custom/llm/keys",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }
    const isAdmin = auth.get("is_admin") === true;
    const mineOnly = e.requestInfo().query["mine"] === "true";

    const filter = isAdmin && !mineOnly ? "" : "user = {:userId}";
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

// Usage rows for the tony dashboard. Admin: every row, unless ?mine=true
// forces it back down to just their own (the Keys page's default view --
// an admin's own usage isn't distinguishable from everyone else's inside
// an unscoped "every row" dump, so this is what lets the page default to
// "my usage" and still offer "all users" as an explicit, opt-in switch).
// Otherwise (non-admin): always just your own, ?mine ignored since there's
// nothing broader to opt out of. Optional ?key=<id> narrows to one key
// (still subject to the same ownership check) and takes priority over
// ?mine.
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
    const mineOnly = e.requestInfo().query["mine"] === "true";

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
    } else if (!isAdmin || mineOnly) {
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

// Backstops the same "at most one active default key per user" rule POST
// /keys already checks, but at the model level -- onRecordCreate/
// onRecordUpdate fire for every save that goes through app.save() (this
// file's own routes included), unlike the *Request hooks, which only cover
// PocketBase's built-in REST record endpoints -- llm_api_keys has none
// exposed, since every read/write already goes through the custom routes
// above. This is what actually catches a write those routes don't (a future
// route, a direct edit in the admin UI); the database itself holds the same
// line via a unique index (see migration
// 1789099510_llm_api_keys_one_default_index.js), so this pair exists purely
// to turn what would otherwise be a raw "UNIQUE constraint failed" error
// into the same message POST /keys already gives.
//
// Self-contained rather than sharing a helper function with each other or
// with POST /keys above -- same JSVM top-level-function caveat noted up top.
$app.onRecordCreate("llm_api_keys").bindFunc((e) => {
  if (e.record.getBool("is_default") && e.record.getString("revoked_at") === "") {
    const dupes = e.app.findRecordsByFilter(
      "llm_api_keys",
      "user = {:userId} && is_default = true && revoked_at = ''",
      "",
      1,
      0,
      { userId: e.record.getString("user") }
    );
    if (dupes.length > 0) {
      throw new BadRequestError("You already have a default key.");
    }
  }
  return e.next();
});

$app.onRecordUpdate("llm_api_keys").bindFunc((e) => {
  if (e.record.getBool("is_default") && e.record.getString("revoked_at") === "") {
    const dupes = e.app.findRecordsByFilter(
      "llm_api_keys",
      "user = {:userId} && is_default = true && revoked_at = '' && id != {:id}",
      "",
      1,
      0,
      { userId: e.record.getString("user"), id: e.record.id }
    );
    if (dupes.length > 0) {
      throw new BadRequestError("You already have a default key.");
    }
  }
  return e.next();
});
