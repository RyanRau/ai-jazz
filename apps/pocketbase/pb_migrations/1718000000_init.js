/// <reference path="../pb_data/types.d.ts" />

// Initial schema:
//  - preferred_products collection (Wally's data), auth-only access
//  - lock down the default users collection so signup is closed (superusers
//    create accounts via the admin UI / CLI)
migrate(
  (app) => {
    const products = new Collection({
      type: "base",
      name: "preferred_products",
      fields: [
        { type: "text", name: "label", required: true, max: 200 },
        { type: "json", name: "search_terms", maxSize: 5000 },
        { type: "text", name: "walmart_product_id", required: true, max: 64 },
        { type: "text", name: "notes", max: 2000 },
      ],
      indexes: ["CREATE INDEX idx_preferred_products_label ON preferred_products (label)"],
      // Any authenticated user can read/write; no public access
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
    });
    app.save(products);

    // Closed signup: only superusers can create user records
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);
  },
  (app) => {
    const products = app.findCollectionByNameOrId("preferred_products");
    app.delete(products);
  }
);
