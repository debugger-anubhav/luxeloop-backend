CREATE TABLE banners (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(150) NOT NULL,
  subtitle    VARCHAR(250),
  image_url   TEXT         NOT NULL,
  cta_text    VARCHAR(50)  NOT NULL DEFAULT 'EXPLORE NOW',
  cta_link    TEXT,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_active ON banners(is_active, sort_order) WHERE is_active = TRUE;

CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
