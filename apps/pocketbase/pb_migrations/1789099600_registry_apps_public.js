/// <reference path="../pb_data/types.d.ts" />

// A public flag so a curated subset of the app catalog can power
// ryanzrau.dev's signed-out landing page (Personal Projects section) via
// pb_hooks/registry_public.pb.js, without loosening registry_apps' own
// auth-gated listRule for the rest of the catalog (see
// pb_migrations/1788918210_registry_apps_and_grants.js).
migrate(
  (app) => {
    const registryApps = app.findCollectionByNameOrId("registry_apps");
    registryApps.fields.add(
      new BoolField({
        name: "public",
        required: false, // BoolField required means "must always be true"
      })
    );
    app.save(registryApps);

    const stash = app.findFirstRecordByFilter("registry_apps", "slug = 'stash'");
    stash.set("public", true);
    app.save(stash);

    const tony = app.findFirstRecordByFilter("registry_apps", "slug = 'tony'");
    tony.set("public", true);
    // Stale copy from before the llm -> tony rename (1788918230); it's about
    // to be shown on the public homepage, so it needs to say what this is.
    tony.set("description", "A home-lab LLM dashboard for tinkering with local models.");
    app.save(tony);

    app.save(
      new Record(registryApps, {
        slug: "bluestar",
        name: "Bluestar",
        url: "https://ui.ryanzrau.dev",
        description:
          "The component library every app on this domain, including this one, is built from.",
        public: true,
      })
    );
  },
  (app) => {
    const bluestar = app.findFirstRecordByFilter("registry_apps", "slug = 'bluestar'");
    app.delete(bluestar);

    const tony = app.findFirstRecordByFilter("registry_apps", "slug = 'tony'");
    tony.set("description", "Local LLM tools — coming soon.");
    app.save(tony);

    const registryApps = app.findCollectionByNameOrId("registry_apps");
    registryApps.fields.removeByName("public");
    app.save(registryApps);
  }
);
