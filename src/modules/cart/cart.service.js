const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function getCart(userId) {
  const { rows } = await query(
    `SELECT ci.*, pv.size, pv.color, pv.rent_price_per_day, pv.sale_price,
            p.id AS product_id, p.name AS product_name, p.slug AS product_slug, p.deposit_amount, p.dry_cleaning_fee,
            p.vendor_id,
            v.shop_name AS vendor_name, v.pickup_address_id AS vendor_pickup_address_id,
            row_to_json(a) AS vendor_pickup_address,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary LIMIT 1) AS product_image
     FROM cart_items ci
     JOIN product_variants pv ON pv.id = ci.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN vendors v ON v.id = p.vendor_id
     LEFT JOIN addresses a ON a.id = v.pickup_address_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at ASC`,
    [userId]
  );
  return rows;
}

async function addItem(userId, data) {
  const { variant_id, item_type, quantity, rental_start, rental_end } = data;

  const { rows: variant } = await query(
    'SELECT * FROM product_variants WHERE id = $1 AND is_active = TRUE',
    [variant_id]
  );
  if (!variant[0]) throw ApiError.notFound('Variant not found');

  if (item_type === 'rent' && variant[0].available_qty < quantity) {
    throw ApiError.conflict('Insufficient stock');
  }

  const { rows } = await query(
    `INSERT INTO cart_items (user_id, variant_id, item_type, quantity, rental_start, rental_end)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, variant_id, item_type, rental_start, rental_end)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING *`,
    [userId, variant_id, item_type, quantity, rental_start || null, rental_end || null]
  );
  return rows[0];
}

async function updateItem(userId, itemId, { quantity }) {
  if (quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');
  const { rows } = await query(
    'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [quantity, itemId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Cart item not found');
  return rows[0];
}

async function removeItem(userId, itemId) {
  const { rows } = await query(
    'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
    [itemId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Cart item not found');
}

async function clearCart(userId) {
  await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
