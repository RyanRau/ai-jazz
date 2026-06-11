CREATE SCHEMA wally;

-- array_to_string is only STABLE; generated columns require IMMUTABLE
CREATE FUNCTION wally.imm_array_to_string(text[], text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$ SELECT array_to_string($1, $2) $$;

CREATE TABLE wally.preferred_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  search_terms text[] NOT NULL DEFAULT '{}',
  walmart_product_id text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  search_text text GENERATED ALWAYS AS (
    label || ' ' || wally.imm_array_to_string(search_terms, ' ') || ' ' || coalesce(notes, '')
  ) STORED
);

CREATE INDEX preferred_products_search_trgm
  ON wally.preferred_products USING GIN (search_text gin_trgm_ops);
