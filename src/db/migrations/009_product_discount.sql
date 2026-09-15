-- Adds a discount_percent field to products for sorting by best discount.
-- Vendors set this when listing a product at a promotional rate.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100);
