const { query } = require('../../config/db');

const PRODUCT_FIELDS = `
  p.id, p.name, p.slug, p.listing_type, p.deposit_amount,
  p.rating_avg, p.review_count, p.tags,
  p.is_featured, p.is_trending, p.is_designer_pick,
  c.name AS category_name, c.slug AS category_slug,
  v.shop_name AS vendor_name, v.slug AS vendor_slug,
  MIN(pv.rent_price_per_day) AS min_rent_price,
  MIN(pv.sale_price) AS min_sale_price,
  (SELECT url FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_primary LIMIT 1) AS primary_image
`;

const BASE_JOINS = `
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN vendors v ON v.id = p.vendor_id
  JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
  WHERE p.is_active = TRUE AND v.status = 'active'
`;

const GROUP_BY = `GROUP BY p.id, c.name, c.slug, v.shop_name, v.slug`;

async function topLevelCategories() {
  const { rows } = await query(
    `SELECT id, name, slug, image_url, description
     FROM categories
     WHERE parent_id IS NULL AND is_active = TRUE AND show_on_homepage = TRUE
     ORDER BY sort_order ASC, name ASC`
  );
  return rows;
}

async function categoryProducts(categoryId, limit = 8) {
  const { rows } = await query(
    `SELECT ${PRODUCT_FIELDS}
     ${BASE_JOINS}
     AND c.id IN (
       WITH RECURSIVE cat_tree AS (
         SELECT id FROM categories WHERE id = $1
         UNION ALL
         SELECT ch.id FROM categories ch JOIN cat_tree ct ON ch.parent_id = ct.id
       )
       SELECT id FROM cat_tree
     )
     ${GROUP_BY}
     ORDER BY p.rating_avg DESC NULLS LAST
     LIMIT $2`,
    [categoryId, limit]
  );
  return rows;
}

async function sectionProducts(flag, limit = 8) {
  const condition =
    flag === 'new_arrivals'
      ? "AND p.created_at >= NOW() - INTERVAL '30 days'"
      : `AND p.${flag} = TRUE`;

  const { rows } = await query(
    `SELECT ${PRODUCT_FIELDS}
     ${BASE_JOINS}
     ${condition}
     ${GROUP_BY}
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function activeBanners() {
  const { rows } = await query(
    `SELECT id, title, subtitle, image_url, cta_text, cta_link
     FROM banners
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`
  );
  return rows;
}

async function getHomepage() {
  const categories = await topLevelCategories();

  const [banners, collectionResults, designerPicks, trending, newArrivals] = await Promise.all([
    activeBanners(),
    Promise.all(categories.map((cat) => categoryProducts(cat.id, 8))),
    sectionProducts('is_designer_pick', 8),
    sectionProducts('is_trending', 8),
    sectionProducts('new_arrivals', 8),
  ]);

  return {
    banners,
    collections: categories.map((cat, i) => ({
      id: cat.slug,
      title: cat.name,
      slug: cat.slug,
      image_url: cat.image_url || null,
      description: cat.description || null,
      products: collectionResults[i],
    })),
    curated: [
      { id: 'designer_picks', title: 'Designer Picks',   products: designerPicks },
      { id: 'trending',       title: 'Trending Wedding', products: trending      },
      { id: 'new_arrivals',   title: 'New Arrivals',     products: newArrivals   },
    ],
  };
}

module.exports = { getHomepage };
