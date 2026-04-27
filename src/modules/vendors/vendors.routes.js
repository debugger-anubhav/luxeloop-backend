const { Router } = require('express');
const controller = require('./vendors.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');
const validate = require('../../middleware/validate');
const { registerVendorSchema } = require('./vendors.schema');

const router = Router();

router.post('/register',          authenticate, validate(registerVendorSchema), controller.registerVendor);
router.get('/me',                 authenticate, requireVendor,                  controller.getMyVendorProfile);
router.patch('/me',               authenticate, requireVendor,                  controller.updateVendorProfile);
router.get('/me/orders',          authenticate, requireVendor,                  controller.getVendorOrders);
router.get('/me/rentals',         authenticate, requireVendor,                  controller.getVendorRentals);
router.get('/me/analytics',       authenticate, requireVendor,                  controller.getVendorAnalytics);
router.post('/me/bank-accounts',  authenticate, requireVendor,                  controller.addBankAccount);
router.get('/:vendorId',                                                         controller.getPublicVendorProfile);

module.exports = router;
