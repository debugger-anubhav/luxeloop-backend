const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function getVariantInventory(vendorId, variantId) {
  const { rows } = await query(
    `SELECT pv.* FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = $1 AND p.vendor_id = $2`,
    [variantId, vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Variant not found');
  return rows[0];
}

async function adjustStock(vendorId, variantId, { stock_qty, available_qty }) {
  const { rows: exists } = await query(
    `SELECT pv.id FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = $1 AND p.vendor_id = $2`,
    [variantId, vendorId]
  );
  if (!exists[0]) throw ApiError.notFound('Variant not found');

  const fields = [];
  const values = [];
  let idx = 1;

  if (stock_qty !== undefined)     { fields.push(`stock_qty = $${idx++}`);     values.push(stock_qty); }
  if (available_qty !== undefined) { fields.push(`available_qty = $${idx++}`); values.push(available_qty); }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(variantId);

  const { rows } = await query(
    `UPDATE product_variants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function reserveStock(variantId, quantity, _itemType, client) {
  const db = client || pool;
  const { rows } = await db.query(
    'SELECT available_qty FROM product_variants WHERE id = $1 FOR UPDATE',
    [variantId]
  );
  if (!rows[0]) throw ApiError.notFound(`Variant ${variantId} not found`);
  if (rows[0].available_qty < quantity) {
    throw ApiError.conflict(`Insufficient stock for variant ${variantId}`);
  }
  await db.query(
    'UPDATE product_variants SET available_qty = available_qty - $1 WHERE id = $2',
    [quantity, variantId]
  );
}

async function releaseStock(variantId, quantity, client) {
  const db = client || pool;
  await db.query(
    'UPDATE product_variants SET available_qty = available_qty + $1 WHERE id = $2',
    [quantity, variantId]
  );
}

module.exports = { getVariantInventory, adjustStock, reserveStock, releaseStock };
