/// <reference path="../pb_data/types.d.ts" />

// Backs hub's /admin access-control matrix and invite flow. registry_grants'
// create/update/deleteRule are all `null` (superuser-only) and `users`'
// listRule only ever lets a caller see their own record, so an admin needs
// a privileged route to read the full user/app/grant picture, to toggle
// grants, and to create/reinvite a stub user -- these routes are that
// route, gated the same way every other admin-only handler in this repo is
// (auth.get("is_admin") !== true), inlined per-handler since PocketBase's
// JSVM does not reliably expose a `.pb.js` file's top-level function
// declarations inside its own routerAdd callbacks.

// The full matrix: every user, every app, and the existing grants between
// them.
routerAdd(
  "GET",
  "/api/custom/admin/access",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const userRecords = e.app.findRecordsByFilter("users", "", "email", 0, 0);
    const users = userRecords.map((u) => ({
      id: u.id,
      email: u.getString("email"),
      name: u.getString("name"),
      verified: u.getBool("verified"),
    }));

    const appRecords = e.app.findRecordsByFilter("registry_apps", "", "name", 0, 0);
    const apps = appRecords.map((a) => ({
      id: a.id,
      slug: a.getString("slug"),
      name: a.getString("name"),
    }));

    const grantRecords = e.app.findRecordsByFilter("registry_grants", "", "", 0, 0);
    const grants = grantRecords.map((g) => ({
      user: g.getString("user"),
      app: g.getString("app"),
    }));

    return e.json(200, { users: users, apps: apps, grants: grants });
  },
  $apis.requireAuth()
);

// Toggle a single grant. Body: { user, app, granted }. Idempotent either way.
routerAdd(
  "POST",
  "/api/custom/admin/access",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const body = e.requestInfo().body;
    const userId = (body.user || "").trim();
    const appId = (body.app || "").trim();
    if (!userId || !appId) {
      throw new BadRequestError("user and app are required.");
    }

    // findFirstRecordByFilter throws (rather than returning null) when no
    // row matches, so "does a grant already exist" has to go through
    // try/catch instead of a truthiness check.
    let existing = null;
    try {
      existing = e.app.findFirstRecordByFilter(
        "registry_grants",
        "user = {:userId} && app = {:appId}",
        { userId: userId, appId: appId }
      );
    } catch (err) {
      existing = null;
    }

    if (body.granted) {
      if (!existing) {
        const collection = e.app.findCollectionByNameOrId("registry_grants");
        const record = new Record(collection, { user: userId, app: appId });
        e.app.save(record);
      }
    } else if (existing) {
      e.app.delete(existing);
    }

    return e.json(200, { ok: true });
  },
  $apis.requireAuth()
);

// Invite a user by email, upserted so the same route covers both "invite
// someone new" and "resend/regenerate a link for someone who hasn't
// activated yet". Body: { email, apps: [registry_apps id, ...] }. Always
// returns a usable activation link, with or without SMTP configured --
// see mailer_config.pb.js and apps/pocketbase/README.md for how email
// sending is (optionally) wired in.
routerAdd(
  "POST",
  "/api/custom/admin/invite",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const body = e.requestInfo().body;
    const email = (body.email || "").trim().toLowerCase();
    const appIds = Array.isArray(body.apps) ? body.apps : [];
    if (!email) {
      throw new BadRequestError("email is required.");
    }

    const usersCollection = e.app.findCollectionByNameOrId("users");

    let existing = null;
    try {
      existing = e.app.findFirstRecordByFilter("users", "email = {:email}", { email: email });
    } catch (err) {
      existing = null;
    }

    let record;
    if (existing) {
      if (existing.getBool("verified")) {
        throw new BadRequestError("A user with this email already exists.");
      }
      // Resend: reuse the stub, but rotate its password -- a password
      // reset token is validated against the record's signing secret
      // (derived from its password), not tracked individually, so
      // changing the password is what invalidates any previously issued
      // link before minting a fresh one.
      record = existing;
      record.setPassword($security.randomString(30));
      e.app.save(record);
    } else {
      record = new Record(usersCollection, {
        email: email,
        verified: false,
        emailVisibility: false,
      });
      record.setPassword($security.randomString(30));
      try {
        e.app.save(record);
      } catch (err) {
        // Two admins inviting the same brand-new email at once: the
        // loser of the race hits a uniqueness error here. Fall back to
        // the resend path instead of surfacing a raw validation error.
        record = e.app.findFirstRecordByFilter("users", "email = {:email}", { email: email });
        if (record.getBool("verified")) {
          throw new BadRequestError("A user with this email already exists.");
        }
        record.setPassword($security.randomString(30));
        e.app.save(record);
      }
    }

    // Additively grant the requested apps -- never revoke on invite/resend,
    // that's what the matrix checkboxes on the same page are already for.
    appIds.forEach((appId) => {
      let grant = null;
      try {
        grant = e.app.findFirstRecordByFilter(
          "registry_grants",
          "user = {:userId} && app = {:appId}",
          { userId: record.id, appId: appId }
        );
      } catch (err) {
        grant = null;
      }
      if (!grant) {
        const grantsCollection = e.app.findCollectionByNameOrId("registry_grants");
        e.app.save(new Record(grantsCollection, { user: record.id, app: appId }));
      }
    });

    const token = record.newPasswordResetToken();
    const link =
      "https://hub.ryanzrau.dev/activate?token=" +
      encodeURIComponent(token) +
      "&email=" +
      encodeURIComponent(email);

    let sent = false;
    if (e.app.settings().smtp.enabled) {
      try {
        const message = new MailerMessage({
          from: {
            address: e.app.settings().meta.senderAddress,
            name: e.app.settings().meta.senderName,
          },
          to: [{ address: email }],
          subject: "You've been invited",
          html:
            "<p>You've been invited to an app on ryanzrau.dev.</p>" +
            '<p><a href="' +
            link +
            '">Activate your account</a></p>' +
            "<p>This link gives full access to the account -- if you weren't " +
            "expecting this, you can ignore it.</p>",
        });
        e.app.newMailClient().send(message);
        sent = true;
      } catch (err) {
        sent = false;
        // A send failure never fails the request (the link is always
        // returned), but it must not be silent -- check Admin UI -> Logs.
        e.app.logger().error("invite email send failed", "error", err, "to", email);
      }
    }

    return e.json(200, { ok: true, id: record.id, link: link, sent: sent });
  },
  $apis.requireAuth()
);

// Delete a user row -- covers both cancelling a pending invite (a
// never-activated stub) and removing an activated user; both are just a
// users row (see GET /access's verified flag, above). Body: { id }.
routerAdd(
  "POST",
  "/api/custom/admin/delete-user",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Admin access required.");
    }

    const body = e.requestInfo().body;
    const userId = (body.id || "").trim();
    if (!userId) {
      throw new BadRequestError("id is required.");
    }
    if (userId === auth.id) {
      throw new BadRequestError("You can't delete your own account.");
    }

    const record = e.app.findRecordById("users", userId);

    // registry_grants' `user` relation has no cascadeDelete (see
    // pb_migrations/1788918210_registry_apps_and_grants.js), so clear a
    // user's grants explicitly before deleting the row they reference.
    const grants = e.app.findRecordsByFilter("registry_grants", "user = {:userId}", "", 0, 0, {
      userId: userId,
    });
    grants.forEach((g) => e.app.delete(g));

    e.app.delete(record);

    return e.json(200, { ok: true });
  },
  $apis.requireAuth()
);
