const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { uniqueSlug } = require('../../utils/slugify');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

function buildBrowseQuery(filters, forCount = false) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  // Recursive category match — includes all descendant sub-categories
  if (filters.category) {
    conditions.push(`
      c.id IN (
        WITH RECURSIVE cat_tree AS (
          SELECT id FROM categories WHERE slug = $${idx++}
          UNION ALL
          SELECT ch.id FROM categories ch JOIN cat_tree ct ON ch.parent_id = ct.id
        )
        SELECT id FROM cat_tree
      )
    `);
    params.push(filters.category);
  }

  if (filters.listing_type) {
    // 'both' products are rentable AND purchasable — include them when filtering by rent or sale
    if (filters.listing_type === 'both') {
      conditions.push(`p.listing_type = 'both'`);
    } else {
      conditions.push(`p.listing_type IN ($${idx++}, 'both')`);
      params.push(filters.listing_type);
    }
  }
  if (filters.min_price) {
    const minP = parseFloat(filters.min_price);
    if (!isNaN(minP)) {
      conditions.push(`(pv.rent_price_per_day >= $${idx} OR pv.sale_price >= $${idx})`);
      params.push(minP);
      idx++;
    }
  }
  if (filters.max_price) {
    const maxP = parseFloat(filters.max_price);
    if (!isNaN(maxP)) {
      conditions.push(`(pv.rent_price_per_day <= $${idx} OR pv.sale_price <= $${idx})`);
      params.push(maxP);
      idx++;
    }
  }
  if (filters.size) {
    conditions.push(`pv.size = $${idx++}`);
    params.push(filters.size);
  }
  if (filters.color) {
    conditions.push(`pv.color ILIKE $${idx++}`);
    params.push(filters.color);
  }
  if (filters.vendor_id) {
    conditions.push(`p.vendor_id = $${idx++}`);
    params.push(filters.vendor_id);
  }
  if (filters.brand) {
    conditions.push(`p.brand ILIKE $${idx++}`);
    params.push(`%${filters.brand}%`);
  }

  // Curated section filters
  if (filters.section === 'trending')       conditions.push('p.is_trending = TRUE');
  if (filters.section === 'featured')       conditions.push('p.is_featured = TRUE');
  if (filters.section === 'designer_picks') conditions.push('p.is_designer_pick = TRUE');
  if (filters.section === 'new_arrivals')   conditions.push("p.created_at >= NOW() - INTERVAL '30 days'");

  return { conditions, params };
}

async function browseProducts(queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const { conditions, params } = buildBrowseQuery(queryParams);

  // Fetch category meta (name + description) when filtering by category slug
  let categoryMeta = null;
  if (queryParams.category) {
    const { rows: catRows } = await query(
      'SELECT name, description FROM categories WHERE slug = $1',
      [queryParams.category]
    );
    if (catRows[0]) categoryMeta = catRows[0];
  }

  const countSql = `
    SELECT COUNT(DISTINCT p.id) FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    WHERE p.is_active AND v.status = 'active' AND ${conditions.join(' AND ')}`;

  const { rows: countRows } = await query(countSql, params);
  const total = parseInt(countRows[0].count, 10);

  let orderClause = 'p.created_at DESC';
  if (queryParams.sort === 'price_asc')  orderClause = 'MIN(pv.rent_price_per_day) ASC NULLS LAST';
  if (queryParams.sort === 'price_desc') orderClause = 'MIN(pv.rent_price_per_day) DESC NULLS LAST';
  if (queryParams.sort === 'rating')     orderClause = 'p.rating_avg DESC NULLS LAST';
  if (queryParams.sort === 'newest')     orderClause = 'p.created_at DESC';
  if (queryParams.sort === 'discount')   orderClause = 'p.discount_percent DESC NULLS LAST, p.created_at DESC';

  const listParams = [...params, limit, offset];
  const listSql = `
    SELECT p.id, p.name, p.slug, p.listing_type, p.deposit_amount,
           p.rating_avg, p.review_count, p.tags,
           p.is_featured, p.is_trending, p.is_designer_pick,
           c.name AS category_name, c.slug AS category_slug,
           v.shop_name AS vendor_name, v.slug AS vendor_slug,
           MIN(pv.rent_price_per_day) AS min_rent_price,
           MIN(pv.sale_price) AS min_sale_price,
           (SELECT url FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_primary LIMIT 1) AS primary_image
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    WHERE p.is_active AND v.status = 'active' AND ${conditions.join(' AND ')}
    GROUP BY p.id, c.name, c.slug, v.shop_name, v.slug
    ORDER BY ${orderClause}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const { rows } = await query(listSql, listParams);
  return {
    products: rows,
    pagination: {
      ...buildPaginationMeta(total, page, limit),
      ...(categoryMeta ? { category_description: categoryMeta.description } : {}),
    },
  };
}

async function searchProducts(queryParams) {
  const { q, page, limit, offset } = { ...queryParams, ...parsePaginationParams(queryParams) };

  if (!q) return browseProducts(queryParams);

  const { conditions, params } = buildBrowseQuery(queryParams);
  const tsQuery = q.trim().split(/\s+/).join(' & ');
  conditions.push(`p.search_vector @@ to_tsquery('english', $${params.length + 1})`);
  params.push(tsQuery);

  const countSql = `
    SELECT COUNT(DISTINCT p.id) FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    WHERE p.is_active AND v.status = 'active' AND ${conditions.join(' AND ')}`;

  const { rows: countRows } = await query(countSql, params);
  const total = parseInt(countRows[0].count, 10);

  const listParams = [...params, limit, offset];
  const listSql = `
    SELECT p.id, p.name, p.slug, p.listing_type, p.deposit_amount,
           p.rating_avg, p.review_count, p.tags,
           p.is_featured, p.is_trending, p.is_designer_pick,
           c.name AS category_name, c.slug AS category_slug,
           v.shop_name AS vendor_name, v.slug AS vendor_slug,
           MIN(pv.rent_price_per_day) AS min_rent_price,
           MIN(pv.sale_price) AS min_sale_price,
           (SELECT url FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_primary LIMIT 1) AS primary_image,
           ts_rank(p.search_vector, to_tsquery('english', $${params.indexOf(tsQuery) + 1})) AS rank
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    WHERE p.is_active AND v.status = 'active' AND ${conditions.join(' AND ')}
    GROUP BY p.id, c.name, c.slug, v.shop_name, v.slug
    ORDER BY rank DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const { rows } = await query(listSql, listParams);
  return { products: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function getProductDetail(slug) {
  const { rows: productRows } = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            v.shop_name AS vendor_name, v.slug AS vendor_slug, v.rating_avg AS vendor_rating
     FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN vendors v ON v.id = p.vendor_id
     WHERE p.slug = $1 AND p.is_active = TRUE`,
    [slug]
  );
  if (!productRows[0]) throw ApiError.notFound('Product not found');

  const product = productRows[0];

  const [variants, images] = await Promise.all([
    query('SELECT * FROM product_variants WHERE product_id = $1 AND is_active = TRUE', [product.id]),
    query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC', [product.id]),
  ]);

  return { ...product, variants: variants.rows, images: images.rows };
}

/**
 * Algorithmic recommendations for "Complete the Look".
 *
 * Scoring (higher = more relevant):
 *   +4  same category
 *   +2  per overlapping tag (capped at 3 tags → max +6)
 *   +3  same brand (when brand is set)
 *   +2  similar price range (min_rent within ±50% of source product's min_rent)
 *   tie-break: rating_avg DESC
 */
async function getRecommendations(slug, limit = 15) {
  const { rows: base } = await query(
    `SELECT p.id, p.category_id, p.brand, p.tags,
            MIN(pv.rent_price_per_day) AS min_rent
     FROM products p
     JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
     WHERE p.slug = $1 AND p.is_active = TRUE
     GROUP BY p.id`,
    [slug]
  );
  if (!base[0]) throw ApiError.notFound('Product not found');

  const { id: productId, category_id, brand, tags, min_rent } = base[0];
  const rentPrice = min_rent ? parseFloat(min_rent) : null;

  const { rows } = await query(
    `SELECT
       p.id, p.name, p.slug, p.listing_type, p.rating_avg, p.brand, p.tags,
       c.name  AS category_name,
       c.slug  AS category_slug,
       MIN(pv.rent_price_per_day) AS min_rent_price,
       MIN(pv.sale_price)         AS min_sale_price,
       (SELECT url FROM product_images pi2
        WHERE pi2.product_id = p.id AND pi2.is_primary LIMIT 1) AS primary_image,

       -- scoring expression
       (
         CASE WHEN p.category_id = $2 THEN 4 ELSE 0 END
         + LEAST(
             COALESCE(array_length(
               ARRAY(SELECT unnest(p.tags) INTERSECT SELECT unnest($3::text[])),
             1), 0) * 2,
             6
           )
         + CASE WHEN $4::text IS NOT NULL AND p.brand = $4::text THEN 3 ELSE 0 END
         + CASE WHEN $5::numeric IS NOT NULL
                 AND MIN(pv.rent_price_per_day) IS NOT NULL
                 AND MIN(pv.rent_price_per_day) BETWEEN $5::numeric * 0.5 AND $5::numeric * 1.5
                THEN 2 ELSE 0 END
       ) AS score

     FROM products p
     JOIN categories c  ON c.id  = p.category_id
     JOIN vendors v     ON v.id  = p.vendor_id
     JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
     WHERE p.is_active = TRUE
       AND v.status = 'active'
       AND p.id != $1
     GROUP BY p.id, c.name, c.slug
     HAVING (
       p.category_id = $2
       OR COALESCE(array_length(
            ARRAY(SELECT unnest(p.tags) INTERSECT SELECT unnest($3::text[])),
          1), 0) > 0
       OR ($4::text IS NOT NULL AND p.brand = $4::text)
     )
     ORDER BY score DESC, p.rating_avg DESC NULLS LAST
     LIMIT $6`,
    [productId, category_id, tags ?? [], brand ?? null, rentPrice, limit]
  );

  return rows;
}

/**
 * Returns aggregated facets for PLP filter UI.
 * Runs the same WHERE clause as browseProducts but aggregates instead of paginating.
 * Brand is intentionally excluded (vendors are small retailers, not major brands).
 */
async function getPLPFacets(queryParams) {
  const { conditions, params } = buildBrowseQuery(queryParams);

  const facetSql = `
    SELECT
      -- categories present in result set
      json_agg(DISTINCT jsonb_build_object('slug', c.slug, 'name', c.name))
        FILTER (WHERE c.slug IS NOT NULL)                         AS categories,

      -- price range (rent or sale, whichever is lower per product)
      MIN(LEAST(pv.rent_price_per_day, pv.sale_price))::float    AS price_min,
      MAX(GREATEST(pv.rent_price_per_day, pv.sale_price))::float AS price_max,

      -- distinct non-null colors
      array_agg(DISTINCT pv.color) FILTER (WHERE pv.color IS NOT NULL) AS colors,

      -- distinct non-null sizes
      array_agg(DISTINCT pv.size)  FILTER (WHERE pv.size  IS NOT NULL) AS sizes,

      -- which listing_types appear
      array_agg(DISTINCT p.listing_type)                               AS listing_types,

      -- flattened unique tags (unnest then reaggregate)
      array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL)           AS tags,

      -- max rating_avg floored to whole numbers (for 3+, 4+ buckets)
      MAX(p.rating_avg)::float                                         AS rating_max

    FROM products p
    JOIN categories c    ON c.id  = p.category_id
    JOIN vendors v       ON v.id  = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    -- unnest tags so we can DISTINCT them
    LEFT JOIN LATERAL unnest(p.tags) AS tag ON TRUE
    WHERE p.is_active AND v.status = 'active'
      AND ${conditions.join(' AND ')}`;

  const { rows } = await query(facetSql, params);
  const row = rows[0] ?? {};

  // Build rating threshold options (e.g. 3+, 4+) based on data
  const ratingMax = row.rating_max ? Math.floor(row.rating_max) : null;
  const ratingThresholds = ratingMax
    ? Array.from({ length: Math.max(0, ratingMax - 2) }, (_, i) => i + 3)
    : [];

  // pg returns array columns as JS arrays already, but listing_types uses
  // array_agg which can come back as a pg text-array string on some drivers —
  // normalise it just in case.
  const normaliseArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    // e.g. "{rent,both}" → ["rent","both"]
    return String(v).replace(/^\{|\}$/g, '').split(',').filter(Boolean);
  };

  return {
    categories:    row.categories    ?? [],
    price_range:   { min: row.price_min ?? 0, max: row.price_max ?? 0 },
    colors:        normaliseArray(row.colors).sort(),
    sizes:         normaliseArray(row.sizes),
    listing_types: normaliseArray(row.listing_types),
    tags:          normaliseArray(row.tags).sort(),
    rating_thresholds: ratingThresholds,
  };
}

async function createProduct(vendorId, data) {
  const { variants, ...productData } = data;

  // Ensure exactly one default: if caller didn't mark any, promote the first.
  const hasDefault = variants.some((v) => v.is_default);
  const normalisedVariants = variants.map((v, i) => ({
    ...v,
    is_default: hasDefault ? !!v.is_default : i === 0,
  }));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slug = await uniqueSlug(productData.name, async (s) => {
      const r = await client.query('SELECT id FROM products WHERE slug = $1', [s]);
      return r.rows.length > 0;
    });

    const { rows: pRows } = await client.query(
      `INSERT INTO products (vendor_id, category_id, name, slug, description, listing_type,
        deposit_amount, brand, fabric, care_instructions, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        vendorId, productData.category_id, productData.name, slug,
        productData.description || null, productData.listing_type, productData.deposit_amount,
        productData.brand || null, productData.fabric || null,
        productData.care_instructions || null, productData.tags,
      ]
    );
    const product = pRows[0];

    const insertedVariants = [];
    for (const v of normalisedVariants) {
      const { rows: vRows } = await client.query(
        `INSERT INTO product_variants (product_id, size, color, color_hex, sku, rent_price_per_day,
          sale_price, stock_qty, available_qty, weight_grams, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10) RETURNING *`,
        [
          product.id, v.size || null, v.color || null, v.color_hex || null,
          v.sku || null, v.rent_price_per_day || null, v.sale_price || null,
          v.stock_qty, v.weight_grams || null, v.is_default,
        ]
      );
      insertedVariants.push(vRows[0]);
    }

    await client.query('COMMIT');
    return { ...product, variants: insertedVariants };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getVariantAvailability(variantId) {
  const { rows } = await query(
    `SELECT oi.rental_start, oi.rental_end
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.variant_id = $1
       AND oi.rental_start IS NOT NULL
       AND oi.rental_end   IS NOT NULL
       AND oi.rental_end   >= CURRENT_DATE
       AND o.status IN ('confirmed','processing','shipped','out_for_delivery','delivered')
     ORDER BY oi.rental_start ASC`,
    [variantId]
  );

  const bookedRanges = rows.map((r) => ({
    start: r.rental_start.toISOString().slice(0, 10),
    end:   r.rental_end.toISOString().slice(0, 10),
  }));

  // Walk forward from today past any contiguous/overlapping booked blocks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let candidate = new Date(today);

  for (const range of bookedRanges) {
    const rangeStart = new Date(range.start);
    const rangeEnd   = new Date(range.end);
    if (candidate >= rangeStart && candidate <= rangeEnd) {
      candidate = new Date(rangeEnd);
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return {
    variantId,
    bookedRanges,
    firstAvailableDate: candidate.toISOString().slice(0, 10),
  };
}

async function updateProduct(vendorId, productId, data) {
  const { rows: exists } = await query(
    'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
    [productId, vendorId]
  );
  if (!exists[0]) throw ApiError.notFound('Product not found');

  const allowed = [
    'name', 'description', 'listing_type', 'deposit_amount', 'dry_cleaning_fee', 'brand',
    'fabric', 'care_instructions', 'tags', 'is_active', 'category_id',
    'is_featured', 'is_trending', 'is_designer_pick',
  ];
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(productId);

  const { rows } = await query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteProduct(vendorId, productId) {
  const { rows } = await query(
    'UPDATE products SET is_active = FALSE WHERE id = $1 AND vendor_id = $2 RETURNING id',
    [productId, vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Product not found');
}

async function uploadProductImages(vendorId, productId, fileUrls) {
  const { rows: exists } = await query(
    'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
    [productId, vendorId]
  );
  if (!exists[0]) throw ApiError.notFound('Product not found');

  const { rows: existing } = await query(
    'SELECT id FROM product_images WHERE product_id = $1 AND is_primary = TRUE',
    [productId]
  );
  const hasPrimary = existing.length > 0;

  const insertedImages = [];
  for (let i = 0; i < fileUrls.length; i++) {
    const isPrimary = !hasPrimary && i === 0;
    const { rows } = await query(
      `INSERT INTO product_images (product_id, url, is_primary, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [productId, fileUrls[i], isPrimary, i]
    );
    insertedImages.push(rows[0]);
  }
  return insertedImages;
}

async function deleteProductImage(vendorId, productId, imageId) {
  const { rows: exists } = await query(
    'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
    [productId, vendorId]
  );
  if (!exists[0]) throw ApiError.notFound('Product not found');

  const { rows } = await query(
    'DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING id',
    [imageId, productId]
  );
  if (!rows[0]) throw ApiError.notFound('Image not found');
}

module.exports = {
  browseProducts, searchProducts, getProductDetail, getVariantAvailability,
  getRecommendations, getPLPFacets,
  createProduct, updateProduct, deleteProduct,
  uploadProductImages, deleteProductImage,
};
