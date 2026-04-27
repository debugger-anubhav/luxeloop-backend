const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { uniqueSlug } = require('../../utils/slugify');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

async function registerVendor(userId, data) {
  const existing = await query('SELECT id FROM vendors WHERE user_id = $1', [userId]);
  if (existing.rows[0]) throw ApiError.conflict('Vendor profile already exists');

  const slug = await uniqueSlug(data.shop_name, async (s) => {
    const r = await query('SELECT id FROM vendors WHERE slug = $1', [s]);
    return r.rows.length > 0;
  });

  const { rows } = await query(
    `INSERT INTO vendors (user_id, shop_name, slug, description, gst_number, pan_number)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, data.shop_name, slug, data.description || null, data.gst_number || null, data.pan_number || null]
  );
  return rows[0];
}

async function getMyVendorProfile(vendorId) {
  const { rows } = await query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
  if (!rows[0]) throw ApiError.notFound('Vendor not found');
  return rows[0];
}

async function updateVendorProfile(vendorId, data) {
  const allowed = ['shop_name','description','gst_number','pan_number'];
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
  values.push(vendorId);

  const { rows } = await query(
    `UPDATE vendors SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function getVendorOrders(vendorId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    'SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.vendor_id = $1',
    [vendorId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT DISTINCT o.id, o.order_number, o.status, o.type, o.total_amount, o.created_at
     FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE oi.vendor_id = $1
     ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
    [vendorId, limit, offset]
  );

  return { orders: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function getVendorRentals(vendorId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE oi.vendor_id = $1`,
    [vendorId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT r.*, oi.variant_id, oi.quantity, oi.rental_start, oi.rental_end
     FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE oi.vendor_id = $1
     ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
    [vendorId, limit, offset]
  );

  return { rentals: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function getVendorAnalytics(vendorId) {
  const [revenue, orders, rentals] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(oi.line_total), 0) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.vendor_id = $1 AND o.status NOT IN ('cancelled','payment_failed')`,
      [vendorId]
    ),
    query(
      `SELECT COUNT(DISTINCT o.id) AS total_orders FROM orders o
       JOIN order_items oi ON oi.order_id = o.id WHERE oi.vendor_id = $1`,
      [vendorId]
    ),
    query(
      `SELECT COUNT(*) AS total_rentals FROM rentals r
       JOIN order_items oi ON oi.id = r.order_item_id WHERE oi.vendor_id = $1`,
      [vendorId]
    ),
  ]);

  return {
    total_revenue: revenue.rows[0].total_revenue,
    total_orders: orders.rows[0].total_orders,
    total_rentals: rentals.rows[0].total_rentals,
  };
}

async function addBankAccount(vendorId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (data.is_primary) {
      await client.query('UPDATE vendor_bank_accounts SET is_primary = FALSE WHERE vendor_id = $1', [vendorId]);
    }
    const { rows } = await client.query(
      `INSERT INTO vendor_bank_accounts (vendor_id, account_holder, bank_name, account_number, ifsc_code, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [vendorId, data.account_holder, data.bank_name, data.account_number, data.ifsc_code, data.is_primary || false]
    );
    if (data.is_primary) {
      await client.query('UPDATE vendors SET bank_account_id = $1 WHERE id = $2', [rows[0].id, vendorId]);
    }
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPublicVendorProfile(vendorId) {
  const { rows } = await query(
    `SELECT id, shop_name, slug, description, logo_url, banner_url,
            rating_avg, rating_count, is_verified, created_at
     FROM vendors WHERE id = $1 AND status = 'active'`,
    [vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Vendor not found');
  return rows[0];
}

module.exports = {
  registerVendor, getMyVendorProfile, updateVendorProfile,
  getVendorOrders, getVendorRentals, getVendorAnalytics,
  addBankAccount, getPublicVendorProfile,
};
