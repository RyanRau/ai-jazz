/// <reference path="../pb_data/types.d.ts" />

// The llm app (apps/llm) was renamed to tony (apps/tony). Update the
// registry_apps catalog entry in place rather than deleting/recreating it,
// so existing registry_grants (which reference the app by record id, not
// slug) keep granting access unchanged.
migrate(
  (app) => {
    const record = app.findFirstRecordByFilter("registry_apps", "slug = 'llm'");
    record.set("slug", "tony");
    record.set("name", "Tony");
    record.set("url", "https://tony.ryanzrau.dev");
    app.save(record);
  },
  (app) => {
    const record = app.findFirstRecordByFilter("registry_apps", "slug = 'tony'");
    record.set("slug", "llm");
    record.set("name", "LLM");
    record.set("url", "https://llm.ryanzrau.dev");
    app.save(record);
  }
);
