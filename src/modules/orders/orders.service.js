const { pool, query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { reserveStock } = require('../inventory/inventory.service');
const { validateAndApplyCoupon } = require('../coupons/coupons.service');
const { createNotification } = require('../notifications/notifications.service');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const TAX_RATE = 0.18;

async function checkout(userId, { address_id, coupon_id, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: cartItems } = await client.query(
      `SELECT ci.*, pv.rent_price_per_day, pv.sale_price, pv.available_qty, pv.sku,
              p.id AS product_id, p.name AS product_name, p.deposit_amount,
              p.vendor_id,
              v.shop_name AS vendor_name,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary LIMIT 1) AS primary_image
       FROM cart_items ci
       JOIN product_variants pv ON pv.id = ci.variant_id
       JOIN products p ON p.id = pv.product_id
       JOIN vendors v ON v.id = p.vendor_id
       WHERE ci.user_id = $1`,
      [userId]
    );

    if (!cartItems.length) throw ApiError.badRequest('Cart is empty');

    const { rows: addressRows } = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [address_id, userId]
    );
    if (!addressRows[0]) throw ApiError.notFound('Address not found');
    const address = addressRows[0];

    for (const item of cartItems) {
      await reserveStock(item.variant_id, item.quantity, item.item_type, client);
    }

    let subtotal = 0;
    let depositTotal = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      let unitPrice = 0;
      let rentalDays = null;

      if (item.item_type === 'rent') {
        const start = new Date(item.rental_start);
        const end = new Date(item.rental_end);
        rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        unitPrice = parseFloat(item.rent_price_per_day) * rentalDays;
        depositTotal += parseFloat(item.deposit_amount) * item.quantity;
      } else {
        unitPrice = parseFloat(item.sale_price);
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        variant_id: item.variant_id,
        vendor_id: item.vendor_id,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: unitPrice,
        rental_days: rentalDays,
        rental_start: item.rental_start || null,
        rental_end: item.rental_end || null,
        deposit_amount: item.item_type === 'rent' ? parseFloat(item.deposit_amount) : 0,
        deposit_status: item.item_type === 'rent' ? 'held' : 'not_applicable',
        line_total: lineTotal,
        product_snapshot: JSON.stringify({
          name: item.product_name,
          sku: item.sku,
          image: item.primary_image,
          vendor_name: item.vendor_name,
          product_id: item.product_id,
        }),
      });
    }

    let discountAmount = 0;
    let appliedCouponId = null;

    if (coupon_id) {
      const { rows: couponRows } = await client.query('SELECT * FROM coupons WHERE id = $1', [coupon_id]);
      if (couponRows[0]) {
        const { discount } = await validateAndApplyCoupon(couponRows[0].code, userId, subtotal, client);
        discountAmount = discount;
        appliedCouponId = coupon_id;
      }
    }

    const taxAmount = Math.round((subtotal - discountAmount) * TAX_RATE * 100) / 100;
    const totalAmount = subtotal - discountAmount + taxAmount + depositTotal;

    const allRent = orderItemsData.every((i) => i.item_type === 'rent');
    const allSale = orderItemsData.every((i) => i.item_type === 'sale');
    const orderType = allRent ? 'rent' : allSale ? 'sale' : 'mixed';

    const deliveryAddress = {
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    };

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, address_id, coupon_id, status, type, subtotal, discount_amount,
        deposit_total, tax_amount, total_amount, delivery_address, notes)
       VALUES ($1,$2,$3,'pending_payment',$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        userId, address_id, appliedCouponId, orderType, subtotal, discountAmount,
        depositTotal, taxAmount, totalAmount, JSON.stringify(deliveryAddress), notes || null,
      ]
    );
    const order = orderRows[0];

    const insertedItems = [];
    for (const item of orderItemsData) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO order_items (order_id, variant_id, vendor_id, item_type, quantity, unit_price,
          rental_days, rental_start, rental_end, deposit_amount, deposit_status, line_total, product_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          order.id, item.variant_id, item.vendor_id, item.item_type, item.quantity,
          item.unit_price, item.rental_days, item.rental_start, item.rental_end,
          item.deposit_amount, item.deposit_status, item.line_total, item.product_snapshot,
        ]
      );
      const orderItem = itemRows[0];
      insertedItems.push(orderItem);

      if (item.item_type === 'rent') {
        const expectedReturn = item.rental_end;
        await client.query(
          `INSERT INTO rentals (order_item_id, status, expected_return_date)
           VALUES ($1, 'scheduled', $2)`,
          [orderItem.id, expectedReturn]
        );
      }
    }

    await client.query(
      `INSERT INTO payments (order_id, gateway, amount, status, payment_type)
       VALUES ($1, 'razorpay', $2, 'initiated', 'charge')`,
      [order.id, totalAmount]
    );

    if (appliedCouponId) {
      await client.query(
        `INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES ($1,$2,$3)`,
        [appliedCouponId, userId, order.id]
      );
      await client.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
        [appliedCouponId]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    createNotification(userId, {
      type: 'order',
      title: 'Order Placed',
      body: `Your order #${order.order_number} has been placed successfully.`,
      payload: { order_id: order.id, order_number: order.order_number },
    }).catch(() => {});

    return { ...order, items: insertedItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMyOrders(userId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    'SELECT COUNT(*) FROM orders WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT o.*, pay.status AS payment_status
     FROM orders o
     LEFT JOIN payments pay ON pay.order_id = o.id AND pay.payment_type = 'charge'
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { orders: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function getOrderDetail(userId, orderId) {
  const { rows } = await query(
    `SELECT o.*, pay.status AS payment_status, pay.gateway_payment_id
     FROM orders o
     LEFT JOIN payments pay ON pay.order_id = o.id AND pay.payment_type = 'charge'
     WHERE o.id = $1 AND o.user_id = $2`,
    [orderId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Order not found');

  const { rows: items } = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId]
  );

  return { ...rows[0], items };
}

async function cancelOrder(userId, orderId) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Order not found');

  const order = rows[0];
  const cancellable = ['pending_payment', 'confirmed', 'processing'];
  if (!cancellable.includes(order.status)) {
    throw ApiError.badRequest(`Cannot cancel order in status: ${order.status}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderItems } = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    for (const item of orderItems) {
      await client.query(
        'UPDATE product_variants SET available_qty = available_qty + $1 WHERE id = $2',
        [item.quantity, item.variant_id]
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = 'Cancelled by customer'
       WHERE id = $1 RETURNING *`,
      [orderId]
    );

    await client.query('COMMIT');

    createNotification(userId, {
      type: 'order',
      title: 'Order Cancelled',
      body: `Your order #${order.order_number} has been cancelled.`,
      payload: { order_id: orderId },
    }).catch(() => {});

    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function requestReturn(userId, orderId) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = 'delivered'`,
    [orderId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Order not found or not eligible for return');

  const { rows: updated } = await query(
    `UPDATE orders SET status = 'return_initiated' WHERE id = $1 RETURNING *`,
    [orderId]
  );
  return updated[0];
}

async function updateOrderStatus(vendorId, orderId, { status }) {
  const { rows: vendorItems } = await query(
    'SELECT id FROM order_items WHERE order_id = $1 AND vendor_id = $2 LIMIT 1',
    [orderId, vendorId]
  );
  if (!vendorItems[0]) throw ApiError.forbidden('Not authorized to update this order');

  const { rows } = await query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, orderId]
  );
  if (!rows[0]) throw ApiError.notFound('Order not found');
  return rows[0];
}

module.exports = { checkout, getMyOrders, getOrderDetail, cancelOrder, requestReturn, updateOrderStatus };
