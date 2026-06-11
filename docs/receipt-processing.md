# Design: Walmart Receipt Processing for Wally

Status: **design only** — not implemented. Goal: photograph a Walmart receipt, extract the line items, and map them to walmart.com products so they can be added to the `preferred_products` collection in PocketBase (and later, to generated cart links).

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

### Stage C — Matching: coarse filter, then AI selection

The backend is now PocketBase, so there's no pg_trgm ranked search. Matching is two-step and leans on an AI step rather than a clever query:

1. **Coarse narrow** — for each extracted line, pull a candidate subset with a PocketBase list filter, e.g. `GET /api/collections/preferred_products/records?filter=label~"ketc"` (`~` is contains/LIKE). At personal scale you can also just fetch the full list once and skip filtering.
2. **AI selects** — hand the extracted line (`HNZ TOM KETC`) plus the candidate subset to the Claude API and let it pick the matching `preferred_products` record (or decide it's new). Receipt abbreviations are exactly the kind of noisy input an LLM disambiguates well, and it sidesteps tuning similarity thresholds.

Results classify into:

- **Known product** (AI matched a record, or exact `walmart_product_id` match after Stage B) → already tracked.
- **New product** → create a `preferred_products` record (label = cleaned name, UPC in notes, resolved item ID if Stage B succeeded), or queue it for review in the admin app.

## 3. Where this runs (future)

Two viable homes, both talking to PocketBase:

- **A PocketBase hook route** — `routerAdd("POST", "/api/custom/receipt", ...)` in `apps/pocketbase/pb_hooks/`. The goja runtime can call the Claude API via `$http.send()` and read/write collections directly. Self-contained, no extra service. Heavier multi-step logic is more awkward in goja than Node, so this fits a thin pipeline.
- **The future `apps/admin` app or an n8n flow** — a Node service / flow that authenticates to PocketBase (dedicated user, `auth-with-password`), runs the extract → resolve → AI-match pipeline, and writes results back via the collection API. Better for an interactive "review the matches" UI or complex orchestration.

Shape of the result either way:

```
POST /api/custom/receipt        (multipart photo upload)
  → { lines: [{ name, upc, price, quantity,
                resolved: { item_id?, product_name? },     # Stage B
                match: { record_id?, label? } }] }         # Stage C (AI)
```

Stateless first version: no receipts collection, no photo storage — the response drives a review step. Persisting purchase history is a later decision.

Config needed when implemented: `ANTHROPIC_API_KEY` (and optionally `WALMART_IO_*`) as runtime env on whichever container runs it (PocketBase `environment` in `deploy.yml` + `/opt/apps/.env`, or the admin app).

## 4. Cart-link generation (closes the loop) — already built

The end goal, generating a shopping cart from tracked products, works off item IDs directly, no receipt needed:

```
https://affil.walmart.com/cart/buynow?items=<itemId1>,<itemId2>,...
```

(Quantity syntax `items=<itemId>_<qty>` is supported by the affiliate cart endpoint; verify current behavior at implementation time.) This already ships as a PocketBase hook route — `GET /api/custom/cart-link?ids=...` (see `apps/pocketbase/pb_hooks/cart_link.pb.js`) — which resolves `preferred_products` record ids to their `walmart_product_id` and returns the cart URL. It's the template for further custom endpoints.

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
