-- Homepage curated section flags
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_trending      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_designer_pick BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_featured      ON products(is_featured)      WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_trending      ON products(is_trending)      WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_designer_pick ON products(is_designer_pick) WHERE is_designer_pick = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_created_at    ON products(created_at DESC);
