const { Router } = require('express');
const controller = require('./reviews.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { createReviewSchema } = require('./reviews.schema');

const router = Router();

router.get('/product/:productId',  controller.getProductReviews);
router.post('/product/:productId', authenticate, validate(createReviewSchema), controller.createReview);
router.patch('/:reviewId',         authenticate, controller.updateReview);
router.delete('/:reviewId',        authenticate, controller.deleteReview);

module.exports = router;
