const asyncHandler = require('../../utils/asyncHandler');
const service = require('./payments.service');

const initiatePayment = asyncHandler(async (req, res) => {
  res.success(await service.initiatePayment(req.user.id, req.body), 'Payment initiated');
});

const verifyPayment = asyncHandler(async (req, res) => {
  res.success(await service.verifyPayment(req.user.id, req.body), 'Payment verified');
});

const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  await service.handleWebhook(req.body, signature);
  res.status(200).json({ received: true });
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  res.success(await service.getPaymentStatus(req.user.id, req.params.orderId), 'Payment status fetched');
});

const refundPayment = asyncHandler(async (req, res) => {
  res.success(await service.refundPayment(req.params.paymentId, req.body.amount), 'Refund initiated');
});

module.exports = { initiatePayment, verifyPayment, handleWebhook, getPaymentStatus, refundPayment };
