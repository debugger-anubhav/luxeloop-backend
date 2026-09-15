const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function getWishlist(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(
      `SELECT w.id, w.created_at, p.id AS product_id, p.name, p.slug, p.brand, p.rating_avg,
              c.name AS category_name, c.slug AS category_slug,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary LIMIT 1) AS primary_image
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = $1 AND p.is_active = TRUE
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query(
      `SELECT COUNT(*) FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 AND p.is_active = TRUE`,
      [userId]
    ),
  ]);

  const total = parseInt(countRows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    items: rows,
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

async function addToWishlist(userId, productId) {
  const { rows: product } = await query('SELECT id FROM products WHERE id = $1', [productId]);
  if (!product[0]) throw ApiError.notFound('Product not found');

  const { rows } = await query(
    `INSERT INTO wishlists (user_id, product_id)
     VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *`,
    [userId, productId]
  );
  return rows[0] || { user_id: userId, product_id: productId };
}

async function removeFromWishlist(userId, productId) {
  const { rows } = await query(
    'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2 RETURNING id',
    [userId, productId]
  );
  if (!rows[0]) throw ApiError.notFound('Item not in wishlist');
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
