const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { releaseStock } = require('../inventory/inventory.service');
const { refundPayment } = require('../payments/payments.service');
const { createNotification } = require('../notifications/notifications.service');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

async function getActiveRentals(userId) {
  const { rows } = await query(
    `SELECT r.*, oi.product_snapshot, oi.quantity, oi.rental_start, oi.rental_end, oi.deposit_amount
     FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1 AND r.status IN ('scheduled','picked_up','active')
     ORDER BY r.expected_return_date ASC`,
    [userId]
  );
  return rows;
}

async function getOverdueRentals(vendorId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE oi.vendor_id = $1 AND r.status = 'overdue'`,
    [vendorId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT r.*, oi.product_snapshot, oi.quantity, oi.variant_id
     FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE oi.vendor_id = $1 AND r.status = 'overdue'
     ORDER BY r.expected_return_date ASC
     LIMIT $2 OFFSET $3`,
    [vendorId, limit, offset]
  );
  return { rentals: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function initiateReturn(userId, rentalId) {
  const { rows } = await query(
    `SELECT r.* FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE r.id = $1 AND o.user_id = $2 AND r.status IN ('active','overdue')`,
    [rentalId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Rental not found or not eligible for return');

  const { rows: updated } = await query(
    `UPDATE rentals SET status = 'return_initiated' WHERE id = $1 RETURNING *`,
    [rentalId]
  );
  return updated[0];
}

async function confirmReturn(rentalId, vendorId, { condition, lateFee, damageFee }) {
  const { rows } = await query(
    `SELECT r.*, oi.variant_id, oi.quantity, oi.deposit_amount, oi.vendor_id, o.user_id, o.id AS order_id
     FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE r.id = $1 AND oi.vendor_id = $2`,
    [rentalId, vendorId]
  );
  if (!rows[0]) throw ApiError.notFound('Rental not found');
  const rental = rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lateFeeDec = lateFee || 0;
    const damageDec = damageFee || 0;
    const hasDamage = damageDec > 0;

    const { rows: updated } = await client.query(
      `UPDATE rentals SET
        status = 'returned',
        actual_return_date = CURRENT_DATE,
        condition_on_return = $1,
        late_fee = $2,
        damage_fee = $3,
        return_confirmed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [condition || null, lateFeeDec, damageDec, rentalId]
    );

    await releaseStock(rental.variant_id, rental.quantity, client);

    const depositStatus = hasDamage ? 'forfeited' : 'released';
    await client.query(
      'UPDATE order_items SET deposit_status = $1 WHERE id = $2',
      [depositStatus, rental.order_item_id]
    );

    await client.query('COMMIT');

    if (!hasDamage && parseFloat(rental.deposit_amount) > 0) {
      const { rows: payRows } = await query(
        `SELECT * FROM payments WHERE order_id = $1 AND payment_type = 'charge' AND status = 'success' LIMIT 1`,
        [rental.order_id]
      );
      if (payRows[0]) {
        refundPayment(payRows[0].id, parseFloat(rental.deposit_amount) * rental.quantity).catch(() => {});
      }
    }

    createNotification(rental.user_id, {
      type: 'rental',
      title: 'Return Confirmed',
      body: `Your rental return has been confirmed. Deposit status: ${depositStatus}.`,
      payload: { rental_id: rentalId },
    }).catch(() => {});

    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function extendRental(userId, rentalId, { extra_days }) {
  const { rows } = await query(
    `SELECT r.*, oi.rental_end, oi.unit_price AS rent_price_per_day, oi.variant_id, o.user_id
     FROM rentals r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE r.id = $1 AND o.user_id = $2 AND r.status = 'active'`,
    [rentalId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Rental not found or not eligible for extension');
  const rental = rows[0];

  const newExpectedReturn = new Date(rental.expected_return_date);
  newExpectedReturn.setDate(newExpectedReturn.getDate() + extra_days);

  const { rows: updated } = await query(
    `UPDATE rentals SET
      extension_days = extension_days + $1,
      expected_return_date = $2
     WHERE id = $3 RETURNING *`,
    [extra_days, newExpectedReturn.toISOString().slice(0, 10), rentalId]
  );
  return updated[0];
}

module.exports = { getActiveRentals, getOverdueRentals, initiateReturn, confirmReturn, extendRental };
