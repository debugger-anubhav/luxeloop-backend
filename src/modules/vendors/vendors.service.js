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
  const { rows } = await query(
    `SELECT v.*,
            row_to_json(a) AS pickup_address
     FROM vendors v
     LEFT JOIN addresses a ON a.id = v.pickup_address_id
     WHERE v.id = $1`,
    [vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Vendor not found');
  return rows[0];
}

async function setPickupAddress(vendorId, data) {
  const { label, full_name, phone, line1, line2, landmark, city, state, pincode, country, lat, lng, full_address } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT user_id, pickup_address_id FROM vendors WHERE id = $1',
      [vendorId]
    );
    const vendorUserId = existing.rows[0]?.user_id;
    const existingAddressId = existing.rows[0]?.pickup_address_id;

    let addressId;
    if (existingAddressId) {
      const { rows } = await client.query(
        `UPDATE addresses
         SET label=$1, full_name=$2, phone=$3, line1=$4, line2=$5, landmark=$6,
             city=$7, state=$8, pincode=$9, country=$10, lat=$11, lng=$12, full_address=$13
         WHERE id=$14 RETURNING id`,
        [label || 'pickup', full_name, phone, line1, line2 || null, landmark || null,
         city, state, pincode, country, lat || null, lng || null, full_address || null, existingAddressId]
      );
      addressId = rows[0].id;
    } else {
      const { rows } = await client.query(
        `INSERT INTO addresses (user_id, label, full_name, phone, line1, line2, landmark, city, state, pincode, country, lat, lng, full_address, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE) RETURNING id`,
        [vendorUserId, label || 'pickup', full_name, phone, line1, line2 || null, landmark || null,
         city, state, pincode, country, lat || null, lng || null, full_address || null]
      );
      addressId = rows[0].id;
    }

    await client.query('UPDATE vendors SET pickup_address_id=$1 WHERE id=$2', [addressId, vendorId]);
    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT v.*, row_to_json(a) AS pickup_address
       FROM vendors v LEFT JOIN addresses a ON a.id = v.pickup_address_id
       WHERE v.id = $1`,
      [vendorId]
    );
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
    `SELECT v.id, v.shop_name, v.slug, v.description, v.logo_url, v.banner_url,
            v.rating_avg, v.rating_count, v.is_verified, v.created_at,
            row_to_json(a) AS pickup_address
     FROM vendors v
     LEFT JOIN addresses a ON a.id = v.pickup_address_id
     WHERE v.id = $1 AND v.status = 'active'`,
    [vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Vendor not found');
  return rows[0];
}

module.exports = {
  registerVendor, getMyVendorProfile, updateVendorProfile,
  setPickupAddress,
  getVendorOrders, getVendorRentals, getVendorAnalytics,
  addBankAccount, getPublicVendorProfile,
};
