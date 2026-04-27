const { Router } = require('express');
const controller = require('./rentals.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');

const router = Router();

router.get('/active',                         authenticate,                controller.getActiveRentals);
router.get('/overdue',                        authenticate, requireVendor, controller.getOverdueRentals);
router.post('/:rentalId/initiate-return',     authenticate,                controller.initiateReturn);
router.post('/:rentalId/confirm-return',      authenticate, requireVendor, controller.confirmReturn);
router.post('/:rentalId/extend',              authenticate,                controller.extendRental);

module.exports = router;
