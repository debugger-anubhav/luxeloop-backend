-- Add is_default flag to product_variants so PDP always loads with a pre-selected size.
-- Only one variant per product should have is_default = TRUE (enforced in application layer).
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: for existing products, mark the first active variant (by created_at) as default.
UPDATE product_variants pv
SET    is_default = TRUE
WHERE  pv.id = (
  SELECT id
  FROM   product_variants
  WHERE  product_id = pv.product_id
    AND  is_active  = TRUE
  ORDER  BY created_at ASC
  LIMIT  1
);
