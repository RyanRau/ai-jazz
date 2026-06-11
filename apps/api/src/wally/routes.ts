import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../auth/middleware.js";
import { pool } from "../db.js";

export const wallyRoutes = new Hono<AuthEnv>();

wallyRoutes.use("*", requireAuth);

const PRODUCT_COLUMNS = "id, label, search_terms, walmart_product_id, notes, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductInput {
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
}

function parseProduct(body: unknown): ProductInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const label = typeof b.label === "string" ? b.label.trim() : "";
  const walmartProductId =
    typeof b.walmart_product_id === "string" ? b.walmart_product_id.trim() : "";
  if (!label || !walmartProductId) return null;

  const searchTerms = Array.isArray(b.search_terms)
    ? b.search_terms.filter((t): t is string => typeof t === "string")
    : [];
  const notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;

  return {
    label,
    search_terms: searchTerms,
    walmart_product_id: walmartProductId,
    notes,
  };
}

wallyRoutes.get("/products", async (c) => {
  const { rows } = await pool.query(
    `SELECT ${PRODUCT_COLUMNS} FROM wally.preferred_products ORDER BY created_at DESC`
  );
  return c.json({ products: rows });
});

wallyRoutes.get("/products/search", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) {
    return c.json({ products: [] });
  }

  // SET LOCAL needs a transaction; lower word_similarity threshold (default
  // 0.6) so short, typo'd queries still match long search_text values
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL pg_trgm.word_similarity_threshold = 0.4");
    const { rows } = await client.query(
      `SELECT ${PRODUCT_COLUMNS},
              GREATEST(similarity(search_text, $1), word_similarity($1, search_text)) AS rank
       FROM wally.preferred_products
       WHERE search_text % $1 OR $1 <% search_text
       ORDER BY rank DESC, created_at DESC
       LIMIT 20`,
      [q]
    );
    await client.query("COMMIT");
    return c.json({ products: rows });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

wallyRoutes.post("/products", async (c) => {
  const product = parseProduct(await c.req.json().catch(() => null));
  if (!product) {
    return c.json({ error: "label and walmart_product_id are required" }, 400);
  }

  const { rows } = await pool.query(
    `INSERT INTO wally.preferred_products (label, search_terms, walmart_product_id, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PRODUCT_COLUMNS}`,
    [product.label, product.search_terms, product.walmart_product_id, product.notes]
  );
  return c.json({ product: rows[0] }, 201);
});

wallyRoutes.put("/products/:id", async (c) => {
  if (!UUID_RE.test(c.req.param("id"))) {
    return c.json({ error: "Product not found" }, 404);
  }
  const product = parseProduct(await c.req.json().catch(() => null));
  if (!product) {
    return c.json({ error: "label and walmart_product_id are required" }, 400);
  }

  const { rows } = await pool.query(
    `UPDATE wally.preferred_products
     SET label = $2, search_terms = $3, walmart_product_id = $4, notes = $5
     WHERE id = $1
     RETURNING ${PRODUCT_COLUMNS}`,
    [
      c.req.param("id"),
      product.label,
      product.search_terms,
      product.walmart_product_id,
      product.notes,
    ]
  );
  if (!rows[0]) {
    return c.json({ error: "Product not found" }, 404);
  }
  return c.json({ product: rows[0] });
});

wallyRoutes.delete("/products/:id", async (c) => {
  if (!UUID_RE.test(c.req.param("id"))) {
    return c.json({ error: "Product not found" }, 404);
  }
  const { rowCount } = await pool.query("DELETE FROM wally.preferred_products WHERE id = $1", [
    c.req.param("id"),
  ]);
  if (!rowCount) {
    return c.json({ error: "Product not found" }, 404);
  }
  return c.json({ ok: true });
});
