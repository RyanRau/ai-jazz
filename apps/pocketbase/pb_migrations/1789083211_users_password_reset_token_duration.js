/// <reference path="../pb_data/types.d.ts" />

// PocketBase's own default (30 minutes) is too short for a real invite
// link -- the admin has to notice it, copy it, and get it to the invitee
// before it expires. Bump to 24 hours; the invite route's resend path
// (admin.pb.js) still invalidates a link on demand by rotating the
// record's password, so lengthening how long an unused link stays valid
// doesn't change how quickly an admin can kill one they don't want live.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.passwordResetToken.duration = 86400;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.passwordResetToken.duration = 1800;
    app.save(users);
  }
);
