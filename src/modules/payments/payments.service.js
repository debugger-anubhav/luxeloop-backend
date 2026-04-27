const Razorpay = require('razorpay');
const crypto = require('crypto');
const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { createNotification } = require('../notifications/notifications.service');
const logger = require('../../config/logger');

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

async function initiatePayment(userId, { order_id, gateway = 'razorpay' }) {
  const { rows } = await query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = \'pending_payment\'',
    [order_id, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Order not found or not in pending_payment state');
  const order = rows[0];

  const amountPaise = Math.round(parseFloat(order.total_amount) * 100);
  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: order.order_number,
  });

  await query(
    `UPDATE payments SET gateway_order_id = $1, status = 'pending'
     WHERE order_id = $2 AND payment_type = 'charge'`,
    [rzpOrder.id, order_id]
  );

  return {
    razorpay_order_id: rzpOrder.id,
    amount: amountPaise,
    currency: 'INR',
    key_id: env.RAZORPAY_KEY_ID,
    order_number: order.order_number,
  };
}

async function verifyPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }) {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE payments SET status = 'success', gateway_payment_id = $1,
        gateway_signature = $2, paid_at = NOW()
       WHERE order_id = $3 AND payment_type = 'charge'`,
      [razorpay_payment_id, razorpay_signature, order_id]
    );

    const { rows } = await client.query(
      `UPDATE orders SET status = 'confirmed' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [order_id, userId]
    );

    await client.query('COMMIT');

    const order = rows[0];
    createNotification(userId, {
      type: 'payment',
      title: 'Payment Successful',
      body: `Payment for order #${order.order_number} confirmed.`,
      payload: { order_id },
    }).catch(() => {});

    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function handleWebhook(rawBody, signature) {
  const isValid = Razorpay.validateWebhookSignature(rawBody, signature, env.RAZORPAY_KEY_SECRET);
  if (!isValid) throw ApiError.unauthorized('Invalid webhook signature');

  const event = JSON.parse(rawBody);
  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;

  if (!paymentEntity) return;

  const gatewayPaymentId = paymentEntity.id;
  const gatewayOrderId = paymentEntity.order_id;

  const { rows: paymentRows } = await query(
    'SELECT * FROM payments WHERE gateway_order_id = $1 AND payment_type = \'charge\'',
    [gatewayOrderId]
  );
  const payment = paymentRows[0];
  if (!payment) return;

  const { rows: orderRows } = await query('SELECT * FROM orders WHERE id = $1', [payment.order_id]);
  const order = orderRows[0];

  if (eventType === 'payment.captured') {
    await query(
      `UPDATE payments SET status = 'success', gateway_payment_id = $1, paid_at = NOW()
       WHERE id = $2`,
      [gatewayPaymentId, payment.id]
    );
    await query(
      'UPDATE orders SET status = \'confirmed\' WHERE id = $1',
      [order.id]
    );
    createNotification(order.user_id, {
      type: 'payment',
      title: 'Payment Confirmed',
      body: `Your payment for order #${order.order_number} was captured.`,
      payload: { order_id: order.id },
    }).catch(() => {});
  } else if (eventType === 'payment.failed') {
    await query(
      `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE id = $2`,
      [paymentEntity.error_description || 'Payment failed', payment.id]
    );
    await query(
      'UPDATE orders SET status = \'payment_failed\' WHERE id = $1',
      [order.id]
    );
  }
}

async function getPaymentStatus(userId, orderId) {
  const { rows } = await query(
    `SELECT p.* FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE p.order_id = $1 AND o.user_id = $2 AND p.payment_type = 'charge'`,
    [orderId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Payment not found');
  return rows[0];
}

async function refundPayment(paymentId, amount) {
  const { rows } = await query(
    'SELECT * FROM payments WHERE id = $1 AND status = \'success\'',
    [paymentId]
  );
  if (!rows[0]) throw ApiError.notFound('Payment not found or not eligible for refund');
  const payment = rows[0];

  const refundAmount = amount || parseFloat(payment.amount);

  try {
    await razorpay.payments.refund(payment.gateway_payment_id, {
      amount: Math.round(refundAmount * 100),
    });
  } catch (err) {
    logger.error({ err }, 'Razorpay refund failed');
    throw ApiError.badRequest('Refund failed: ' + err.message);
  }

  const { rows: refundRows } = await query(
    `INSERT INTO payments (order_id, gateway, amount, status, payment_type, parent_payment_id, paid_at)
     VALUES ($1, 'razorpay', $2, 'refunded', 'refund', $3, NOW()) RETURNING *`,
    [payment.order_id, refundAmount, paymentId]
  );

  const newStatus = refundAmount >= parseFloat(payment.amount) ? 'refunded' : 'partially_refunded';
  await query('UPDATE payments SET status = $1 WHERE id = $2', [newStatus, paymentId]);

  return refundRows[0];
}

module.exports = { initiatePayment, verifyPayment, handleWebhook, getPaymentStatus, refundPayment };
