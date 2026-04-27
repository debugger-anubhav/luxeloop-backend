const { Router } = require('express');
const controller = require('./wishlists.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/',              authenticate, controller.getWishlist);
router.post('/:productId',   authenticate, controller.addToWishlist);
router.delete('/:productId', authenticate, controller.removeFromWishlist);

module.exports = router;
