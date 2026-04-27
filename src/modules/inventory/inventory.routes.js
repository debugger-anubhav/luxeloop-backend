const { Router } = require('express');
const controller = require('./inventory.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');

const router = Router();

router.get('/variant/:variantId',   authenticate, requireVendor, controller.getVariantInventory);
router.patch('/variant/:variantId', authenticate, requireVendor, controller.adjustStock);

module.exports = router;
