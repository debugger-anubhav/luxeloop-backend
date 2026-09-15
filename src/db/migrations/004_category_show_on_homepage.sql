ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_categories_homepage
  ON categories(show_on_homepage) WHERE show_on_homepage = TRUE;
