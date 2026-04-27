const { Router } = require('express');
const controller = require('./orders.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');
const validate = require('../../middleware/validate');
const { checkoutSchema } = require('./orders.schema');

const router = Router();

router.post('/checkout',          authenticate, validate(checkoutSchema),  controller.checkout);
router.get('/',                   authenticate,                             controller.getMyOrders);
router.get('/:orderId',           authenticate,                             controller.getOrderDetail);
router.post('/:orderId/cancel',   authenticate,                             controller.cancelOrder);
router.post('/:orderId/return',   authenticate,                             controller.requestReturn);
router.patch('/:orderId/status',  authenticate, requireVendor,              controller.updateOrderStatus);

module.exports = router;
