/// <reference path="../pb_data/types.d.ts" />

// The cross-app dashboard registry: which apps exist, and which user may see
// which app. registry_apps is the catalog (any signed-in user may read it —
// it's just metadata); registry_grants is the actual access-control list
// (a user only ever sees their own grants, and only a superuser may write
// grants at all, via the Admin UI — that's the whole admin-control mechanism,
// no custom admin screen needed). The hub dashboard app reads registry_grants
// to know which apps to show a signed-in user.
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;

    const registryApps = new Collection({
      type: "base",
      name: "registry_apps",
      fields: [
        { type: "text", name: "slug", required: true, max: 60 },
        { type: "text", name: "name", required: true, max: 100 },
        { type: "url", name: "url", required: true },
        { type: "text", name: "description", max: 300 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(registryApps);

    app.save(
      new Collection({
        type: "base",
        name: "registry_grants",
        fields: [
          {
            type: "relation",
            name: "user",
            collectionId: usersId,
            required: true,
            maxSelect: 1,
          },
          {
            type: "relation",
            name: "app",
            collectionId: registryApps.id,
            required: true,
            maxSelect: 1,
          },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        listRule: "user = @request.auth.id",
        viewRule: "user = @request.auth.id",
        createRule: null,
        updateRule: null,
        deleteRule: null,
      })
    );

    // Seed the catalog so the admin only ever has to manage grants by hand.
    app.save(
      new Record(registryApps, {
        slug: "llm",
        name: "LLM",
        url: "https://llm.ryanzrau.dev",
        description: "Local LLM tools — coming soon.",
      })
    );
    app.save(
      new Record(registryApps, {
        slug: "stash",
        name: "Stash",
        url: "https://stash.ryanzrau.dev",
        description: "Track household items and equipment, and share them.",
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("registry_grants"));
    app.delete(app.findCollectionByNameOrId("registry_apps"));
  }
);
