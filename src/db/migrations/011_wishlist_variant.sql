-- Add variant_id to wishlists and update unique constraint to (user_id, variant_id)
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

-- Backfill: assign default (or first) variant to existing rows
UPDATE wishlists w
SET variant_id = (
  SELECT pv.id FROM product_variants pv
  WHERE pv.product_id = w.product_id AND pv.is_active = TRUE
  ORDER BY pv.is_default DESC, pv.created_at ASC
  LIMIT 1
)
WHERE variant_id IS NULL;

-- Make variant_id non-nullable now that it's backfilled
ALTER TABLE wishlists ALTER COLUMN variant_id SET NOT NULL;

-- Replace old unique constraint with variant-level one
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_product_id_key;
ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_variant_id_key UNIQUE (user_id, variant_id);
