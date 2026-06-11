# Design: Walmart Receipt Processing for Wally

Status: **design only** — not implemented. Goal: photograph a Walmart receipt, extract the line items, and map them to walmart.com products so they can be added to `wally.preferred_products` (and later, to generated cart links).

## 1. What's actually on a Walmart receipt

A printed Walmart receipt line item contains:

- **Abbreviated product name** — heavily truncated, all-caps (e.g. `GV 2% MILK`, `HNZ TOM KETC`). Not a reliable key on its own, but good fuzzy-search input.
- **A 12-digit numeric code** — this is the product's **UPC-A barcode number, minus its check digit, zero-padded**. It identifies the _product_, not the transaction.
- **Department/tax flags** (`F`, `T`, `O`, weight lines for produce) — useful only for filtering noise.
- **TC# (Transaction Code)** — a 20-digit transaction identifier encoded in the barcode at the bottom. Identifies the _purchase_, not products.

### The identifier mismatch (the hard part)

Wally stores the **walmart.com item ID** — the number in product URLs (`walmart.com/ip/<item-id>`) and the one usable in cart links. Receipts give you a **UPC**. These are different namespaces with no offline mapping; bridging them requires a lookup step:

| Identifier     | Where it lives                              | Example use                                                               |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| UPC (12-digit) | Receipt line, product barcode               | `search?q=<upc>` on walmart.com usually resolves it                       |
| Item ID        | walmart.com URLs, affiliate API, cart links | `walmart.com/ip/10307289`, `affil.walmart.com/cart/buynow?items=10307289` |
| TC#            | Receipt barcode                             | `walmart.com/receipt-lookup` (store, date, total, card digits)            |

## 2. Pipeline design

```
receipt photo ──► extract line items ──► resolve UPC → item ID ──► match against
                  (Claude vision)          (lookup step)            preferred_products
                                                                    (existing fuzzy search)
                                                                          │
                                                              user confirms / adds new
```

### Stage A — Extraction: Claude vision (recommended)

Send the receipt photo to the Claude API with a prompt requesting structured JSON (`[{ name, upc, price, quantity }]`). Receipts are high-contrast machine-printed text, which vision models handle far better than classical OCR pipelines (tesseract struggles with crumpled/skewed photos and produces uncorrected digit errors in UPCs). Costs pennies per receipt at personal volume; needs an `ANTHROPIC_API_KEY` runtime secret on the api container.

Alternative (rejected): tesseract via node bindings — free but materially worse accuracy on phone photos, and digit errors in UPCs poison the lookup stage.

### Stage B — Resolution: UPC → item ID, best-effort with fallbacks

1. **Walmart Affiliate API (walmart.io)** — the proper path. The [Product Lookup endpoint](https://walmart.io/docs/affiliates/v1/product-lookup) accepts a `upc` parameter and returns `itemId`, name, price, and images. Requires (free) walmart.io developer registration and signed-request auth. Worth doing: it also unlocks search and price data for future wally features.
2. **walmart.com UPC search** (fallback, no key): `walmart.com/search?q=<upc>` usually lands on or returns the exact product; scraping is brittle (bot detection) so treat as manual-assist, not automation: surface the search URL in the UI for one-click human resolution.
3. **Third-party UPC databases** (upcitemdb.com, barcodespider.com) — free tiers exist, coverage is inconsistent for Walmart store brands; not a foundation, possibly a fallback.
4. **Give up gracefully** — keep the line with `upc` + extracted name and let fuzzy matching (Stage C) handle it; the UPC can be resolved later.

### Stage C — Matching: reuse the existing fuzzy search

For each extracted line, call the existing `GET /wally/products/search?q=<extracted name>` (pg_trgm). Receipt abbreviations are exactly the kind of noisy input it tolerates (`HNZ TOM KETC` → "Heinz Tomato Ketchup 32oz" scores well on `word_similarity`). Results classify into:

- **Known product** (search hit above a threshold, or exact `walmart_product_id` match after Stage B) → already in the database; optionally bump usage stats later.
- **New product** → prefill the existing Add Product modal with the extracted name as label, UPC in notes, and resolved item ID if Stage B succeeded.

## 3. Proposed API surface (future)

```
POST /wally/receipts            multipart photo upload
  → { lines: [{ name, upc, price, quantity,
                resolved: { item_id?, product_name? },        # Stage B result
                match: { product_id?, label?, rank? } }] }    # Stage C result
```

Stateless first version: no receipts table, no storage of photos — the response drives an interactive review UI in wally. Persisting receipts/purchase history is a separate later decision.

New schema/config needed when implemented: none for the database; `ANTHROPIC_API_KEY` (and optionally `WALMART_IO_*` credentials) added to the api's `environment` in `deploy.yml` + droplet `.env`.

## 4. Cart-link generation (closes the loop)

The end goal — generating a shopping cart from preferred products — works off item IDs directly, no receipt needed:

```
https://affil.walmart.com/cart/buynow?items=<itemId1>,<itemId2>,...
```

(Quantity syntax `items=<itemId>_<qty>` is supported by the affiliate cart endpoint; verify current behavior at implementation time.) Since `preferred_products.walmart_product_id` already stores item IDs, a first `GET /wally/cart-link?ids=...` endpoint is trivial and independent of receipt processing — it could ship first.

## 5. Open questions for implementation time

- Does the affiliate Product Lookup free tier still cover UPC lookups at hobby volume? (walmart.io terms change periodically.)
- Receipt-lookup automation via TC# (`walmart.com/receipt-lookup`) returns an itemized digital receipt — investigating whether it exposes item IDs directly would eliminate Stage B entirely for card purchases, but it sits behind a captcha and is likely ToS-sensitive.
- Whether to store receipt history (purchase frequency would enable "running low?" suggestions).

## Sources

- [Walmart receipt lookup tool](https://www.walmart.com/receipt-lookup)
- [Walmart.io Affiliate Product Lookup docs](https://walmart.io/docs/affiliates/v1/product-lookup)
- [Walmart.io GM Add To Cart docs](https://walmart.io/docs/affiliates/v1/gm-add-to-cart)
- [Decoding Walmart receipt barcodes](https://www.ecstaticlyrics.com/blog/148)
- [Identifying receipt items by UPC](https://www.quora.com/How-do-I-identify-items-off-of-a-Walmart-receipt-by-UPC-code-only)
