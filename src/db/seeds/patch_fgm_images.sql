-- Insert additional gallery images for the Forest Green Mermaid Gown.
-- Safe to run multiple times (ON CONFLICT DO NOTHING via unique url+product check).
DO $$
DECLARE
  pid UUID;
BEGIN
  SELECT id INTO pid FROM products WHERE slug = 'forest-green-mermaid-gown';
  IF pid IS NULL THEN
    RAISE NOTICE 'Product not found, skipping';
    RETURN;
  END IF;

  INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES
    (pid, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', FALSE, 1),
    (pid, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80', FALSE, 2),
    (pid, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80', FALSE, 3),
    (pid, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80', FALSE, 4)
  ON CONFLICT DO NOTHING;
END $$;
