const { Router } = require('express');
const express = require('express');
const controller = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.post('/initiate',          authenticate, controller.initiatePayment);
router.post('/verify',            authenticate, controller.verifyPayment);
router.post('/webhook',           express.raw({ type: 'application/json' }), controller.handleWebhook);
router.get('/order/:orderId',     authenticate, controller.getPaymentStatus);
router.post('/refund/:paymentId', authenticate, controller.refundPayment);

module.exports = router;
