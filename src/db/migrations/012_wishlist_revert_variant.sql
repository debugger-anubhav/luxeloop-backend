-- Deduplicate: keep only the earliest row per (user_id, product_id)
DELETE FROM wishlists w
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, product_id) id
  FROM wishlists
  ORDER BY user_id, product_id, created_at ASC
);

ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_variant_id_key;
ALTER TABLE wishlists DROP COLUMN IF EXISTS variant_id;
ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);
