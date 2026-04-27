const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { uniqueSlug } = require('../../utils/slugify');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

function buildBrowseQuery(filters, forCount = false) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.category) {
    conditions.push(`c.slug = $${idx++}`);
    params.push(filters.category);
  }
  if (filters.listing_type) {
    conditions.push(`p.listing_type = $${idx++}`);
    params.push(filters.listing_type);
  }
  if (filters.min_price) {
    conditions.push(`(pv.rent_price_per_day >= $${idx} OR pv.sale_price >= $${idx})`);
    params.push(filters.min_price);
    idx++;
  }
  if (filters.max_price) {
    conditions.push(`(pv.rent_price_per_day <= $${idx} OR pv.sale_price <= $${idx})`);
    params.push(filters.max_price);
    idx++;
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

  return { conditions, params };
}

async function browseProducts(queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const { conditions, params } = buildBrowseQuery(queryParams);

  const countSql = `
    SELECT COUNT(DISTINCT p.id) FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN vendors v ON v.id = p.vendor_id
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active
    WHERE p.is_active AND v.status = 'active' AND ${conditions.join(' AND ')}`;

  const { rows: countRows } = await query(countSql, params);
  const total = parseInt(countRows[0].count, 10);

  let orderClause = 'p.created_at DESC';
  if (queryParams.sort === 'price_asc')  orderClause = 'MIN(pv.sale_price) ASC NULLS LAST';
  if (queryParams.sort === 'price_desc') orderClause = 'MIN(pv.sale_price) DESC NULLS LAST';
  if (queryParams.sort === 'rating')     orderClause = 'p.rating_avg DESC';
  if (queryParams.sort === 'newest')     orderClause = 'p.created_at DESC';

  const listParams = [...params, limit, offset];
  const listSql = `
    SELECT p.id, p.name, p.slug, p.listing_type, p.deposit_amount,
           p.rating_avg, p.review_count, p.tags,
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
  return { products: rows, pagination: buildPaginationMeta(total, page, limit) };
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

async function createProduct(vendorId, data) {
  const { variants, ...productData } = data;
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
    for (const v of variants) {
      const { rows: vRows } = await client.query(
        `INSERT INTO product_variants (product_id, size, color, color_hex, sku, rent_price_per_day,
          sale_price, stock_qty, available_qty, weight_grams)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING *`,
        [
          product.id, v.size || null, v.color || null, v.color_hex || null,
          v.sku || null, v.rent_price_per_day || null, v.sale_price || null,
          v.stock_qty, v.weight_grams || null,
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

async function updateProduct(vendorId, productId, data) {
  const { rows: exists } = await query(
    'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
    [productId, vendorId]
  );
  if (!exists[0]) throw ApiError.notFound('Product not found');

  const allowed = ['name','description','listing_type','deposit_amount','brand','fabric','care_instructions','tags','is_active','category_id'];
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
  browseProducts, searchProducts, getProductDetail,
  createProduct, updateProduct, deleteProduct,
  uploadProductImages, deleteProductImage,
};
