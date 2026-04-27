const asyncHandler = require('../../utils/asyncHandler');
const service = require('./reviews.service');

const getProductReviews = asyncHandler(async (req, res) => {
  const { reviews, pagination } = await service.getProductReviews(req.params.productId, req.query);
  res.paginated(reviews, pagination, 'Reviews fetched');
});

const createReview = asyncHandler(async (req, res) => {
  res.success(await service.createReview(req.user.id, req.params.productId, req.body), 'Review created', 201);
});

const updateReview = asyncHandler(async (req, res) => {
  res.success(await service.updateReview(req.user.id, req.params.reviewId, req.body), 'Review updated');
});

const deleteReview = asyncHandler(async (req, res) => {
  await service.deleteReview(req.user.id, req.params.reviewId);
  res.success(null, 'Review deleted');
});

module.exports = { getProductReviews, createReview, updateReview, deleteReview };
