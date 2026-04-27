const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function validateCoupon(code, userId, subtotal) {
  const { rows } = await query(
    `SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE
     AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until >= NOW())`,
    [code.toUpperCase()]
  );
  const coupon = rows[0];
  if (!coupon) throw ApiError.notFound('Coupon not found or expired');

  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    throw ApiError.conflict('Coupon usage limit reached');
  }

  if (subtotal < parseFloat(coupon.min_order_value)) {
    throw ApiError.badRequest(`Minimum order value is ₹${coupon.min_order_value}`);
  }

  const { rows: usageRows } = await query(
    'SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2',
    [coupon.id, userId]
  );
  if (parseInt(usageRows[0].count, 10) >= coupon.per_user_limit) {
    throw ApiError.conflict('You have already used this coupon');
  }

  let discount = 0;
  if (coupon.discount_type === 'flat') {
    discount = parseFloat(coupon.discount_value);
  } else {
    discount = (subtotal * parseFloat(coupon.discount_value)) / 100;
    if (coupon.max_discount_cap) {
      discount = Math.min(discount, parseFloat(coupon.max_discount_cap));
    }
  }

  return { coupon, discount: Math.round(discount * 100) / 100 };
}

async function validateAndApplyCoupon(code, userId, subtotal, client) {
  const result = await validateCoupon(code, userId, subtotal);
  return result;
}

async function getMyCoupons(vendorId) {
  // coupons don't have vendor_id in schema — return platform coupons for now
  const { rows } = await query('SELECT * FROM coupons WHERE is_active = TRUE ORDER BY created_at DESC');
  return rows;
}

async function createCoupon(data) {
  const { rows } = await query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value,
      max_discount_cap, usage_limit, per_user_limit, applies_to, valid_from, valid_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.code, data.description || null, data.discount_type, data.discount_value,
      data.min_order_value, data.max_discount_cap || null, data.usage_limit || null,
      data.per_user_limit, data.applies_to, data.valid_from || new Date(), data.valid_until || null,
    ]
  );
  return rows[0];
}

async function updateCoupon(couponId, data) {
  const allowed = ['description','discount_type','discount_value','min_order_value','max_discount_cap','usage_limit','per_user_limit','applies_to','valid_from','valid_until','is_active'];
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
  values.push(couponId);

  const { rows } = await query(
    `UPDATE coupons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!rows[0]) throw ApiError.notFound('Coupon not found');
  return rows[0];
}

async function deleteCoupon(couponId) {
  const { rows } = await query(
    'UPDATE coupons SET is_active = FALSE WHERE id = $1 RETURNING id',
    [couponId]
  );
  if (!rows[0]) throw ApiError.notFound('Coupon not found');
}

module.exports = { validateCoupon, validateAndApplyCoupon, getMyCoupons, createCoupon, updateCoupon, deleteCoupon };
