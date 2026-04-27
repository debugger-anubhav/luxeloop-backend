const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

async function getProductReviews(productId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    'SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_visible = TRUE',
    [productId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT r.*, u.full_name, u.avatar_url
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 AND r.is_visible = TRUE
     ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
    [productId, limit, offset]
  );

  return { reviews: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function createReview(userId, productId, data) {
  const { order_item_id, rating, title, comment, images } = data;

  const { rows: eligible } = await query(
    `SELECT oi.id FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN product_variants pv ON pv.id = oi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE oi.id = $1 AND o.user_id = $2 AND p.id = $3
       AND o.status IN ('delivered','returned')`,
    [order_item_id, userId, productId]
  );
  if (!eligible[0]) throw ApiError.forbidden('Not eligible to review this product');

  const { rows: existing } = await query(
    'SELECT id FROM reviews WHERE user_id = $1 AND order_item_id = $2',
    [userId, order_item_id]
  );
  if (existing[0]) throw ApiError.conflict('You have already reviewed this item');

  const { rows } = await query(
    `INSERT INTO reviews (user_id, product_id, order_item_id, rating, title, comment, images)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, productId, order_item_id, rating, title || null, comment || null, images]
  );
  return rows[0];
}

async function updateReview(userId, reviewId, { rating, title, comment, images }) {
  const { rows: exists } = await query(
    'SELECT id FROM reviews WHERE id = $1 AND user_id = $2',
    [reviewId, userId]
  );
  if (!exists[0]) throw ApiError.notFound('Review not found');

  const fields = [];
  const values = [];
  let idx = 1;

  if (rating !== undefined)  { fields.push(`rating = $${idx++}`);  values.push(rating); }
  if (title !== undefined)   { fields.push(`title = $${idx++}`);   values.push(title); }
  if (comment !== undefined) { fields.push(`comment = $${idx++}`); values.push(comment); }
  if (images !== undefined)  { fields.push(`images = $${idx++}`);  values.push(images); }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(reviewId);

  const { rows } = await query(
    `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteReview(userId, reviewId) {
  const { rows } = await query(
    'UPDATE reviews SET is_visible = FALSE WHERE id = $1 AND user_id = $2 RETURNING id',
    [reviewId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Review not found');
}

module.exports = { getProductReviews, createReview, updateReview, deleteReview };
