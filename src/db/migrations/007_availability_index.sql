-- Index to accelerate variant availability queries (booked date ranges)
CREATE INDEX IF NOT EXISTS idx_order_items_variant_dates
  ON order_items (variant_id, rental_start, rental_end)
  WHERE rental_start IS NOT NULL AND rental_end IS NOT NULL;
