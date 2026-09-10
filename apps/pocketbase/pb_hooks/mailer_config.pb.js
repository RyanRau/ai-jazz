/// <reference path="../pb_data/types.d.ts" />

// Wires SMTP from the droplet's env, if provided, so hub's invite-email
// feature (and any future email-sending hook -- this is PocketBase's own
// settings-level mailer, not scoped to invites) can actually send mail.
// Optional: if SMTP_HOST is unset, smtp.enabled stays false and callers
// fall back to whatever non-email behavior they have (admin.pb.js's
// invite route falls back to link-only).
//
// Once this hook exists, these env vars are the sole source of truth for
// SMTP settings -- a superuser who hand-edits SMTP in the PocketBase
// Admin UI will have that change reverted on the next restart. That
// matches this repo's existing env-var-as-source-of-truth convention for
// runtime secrets (see CLAUDE.md), stated here so it isn't a surprise.
onBootstrap((e) => {
  e.next();

  const host = $os.getenv("SMTP_HOST");
  if (!host) return;

  const settings = e.app.settings();
  const desired = {
    enabled: true,
    host: host,
    port: parseInt($os.getenv("SMTP_PORT") || "587", 10),
    username: $os.getenv("SMTP_USERNAME") || "",
    password: $os.getenv("SMTP_PASSWORD") || "",
    authMethod: "PLAIN",
    tls: true,
    localName: "",
  };

  // Skip the write if nothing changed, so a plain restart doesn't produce
  // a no-op settings mutation (and log line) on every boot.
  const unchanged =
    JSON.stringify(settings.smtp) === JSON.stringify(desired) &&
    (!$os.getenv("SMTP_SENDER_ADDRESS") ||
      settings.meta.senderAddress === $os.getenv("SMTP_SENDER_ADDRESS")) &&
    (!$os.getenv("SMTP_SENDER_NAME") ||
      settings.meta.senderName === $os.getenv("SMTP_SENDER_NAME"));
  if (unchanged) return;

  settings.smtp = desired;
  if ($os.getenv("SMTP_SENDER_ADDRESS")) {
    settings.meta.senderAddress = $os.getenv("SMTP_SENDER_ADDRESS");
  }
  if ($os.getenv("SMTP_SENDER_NAME")) {
    settings.meta.senderName = $os.getenv("SMTP_SENDER_NAME");
  }
  e.app.save(settings);
});
