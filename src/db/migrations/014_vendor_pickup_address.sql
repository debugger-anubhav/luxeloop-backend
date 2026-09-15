ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS pickup_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_pickup_address ON vendors(pickup_address_id);
