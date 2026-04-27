const { Router } = require('express');
const controller = require('./coupons.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');
const validate = require('../../middleware/validate');
const { createCouponSchema } = require('./coupons.schema');

const router = Router();

router.post('/validate',      authenticate,                              controller.validateCoupon);
router.get('/',               authenticate, requireVendor,              controller.getMyCoupons);
router.post('/',              authenticate, requireVendor, validate(createCouponSchema), controller.createCoupon);
router.patch('/:couponId',    authenticate, requireVendor,              controller.updateCoupon);
router.delete('/:couponId',   authenticate, requireVendor,              controller.deleteCoupon);

module.exports = router;
