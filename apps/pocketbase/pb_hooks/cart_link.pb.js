/// <reference path="../pb_data/types.d.ts" />

// GET /api/custom/cart-link?ids=<id1>,<id2>,...
//
// Demonstrates a custom computed route alongside PocketBase's generated API.
// Each id may be a preferred_products record id (resolved to its
// walmart_product_id) or a raw Walmart item id. Returns a Walmart affiliate
// "buy now" cart URL. Requires authentication.
routerAdd(
  "GET",
  "/api/custom/cart-link",
  (e) => {
    const raw = e.requestInfo().query["ids"] || "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return e.json(400, { error: "provide ?ids=comma,separated,ids" });
    }

    const items = ids.map((id) => {
      try {
        const rec = e.app.findRecordById("preferred_products", id);
        return rec.getString("walmart_product_id");
      } catch {
        // Not a known record id — assume it's already a Walmart item id
        return id;
      }
    });

    return e.json(200, {
      url: "https://affil.walmart.com/cart/buynow?items=" + items.join(","),
    });
  },
  $apis.requireAuth()
);
