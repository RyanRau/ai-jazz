/// <reference path="../pb_data/types.d.ts" />

// A per-app emoji shown next to its name in hub's dashboard cards and the
// AppSwitcher dropdown. Optional -- a new app can go without one until an
// admin sets it in the Admin UI.
migrate(
  (app) => {
    const registryApps = app.findCollectionByNameOrId("registry_apps");
    registryApps.fields.add(
      new TextField({
        name: "icon",
        required: false,
        max: 32, // generous -- a real emoji can be a multi-codepoint ZWJ/flag/skin-tone sequence
      })
    );
    app.save(registryApps);

    const tony = app.findFirstRecordByFilter("registry_apps", "slug = 'tony'");
    tony.set("icon", "🤖");
    app.save(tony);

    const stash = app.findFirstRecordByFilter("registry_apps", "slug = 'stash'");
    stash.set("icon", "📦");
    app.save(stash);
  },
  (app) => {
    const registryApps = app.findCollectionByNameOrId("registry_apps");
    registryApps.fields.removeByName("icon");
    app.save(registryApps);
  }
);
