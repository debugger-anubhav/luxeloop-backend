const asyncHandler = require('../../utils/asyncHandler');
const service = require('./wishlists.service');

const getWishlist = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
  const { items, pagination } = await service.getWishlist(req.user.id, { page, limit });
  res.paginated(items, pagination, 'Wishlist fetched');
});

const addToWishlist      = asyncHandler(async (req, res) => { res.success(await service.addToWishlist(req.user.id, req.params.productId), 'Added to wishlist', 201); });
const removeFromWishlist = asyncHandler(async (req, res) => { await service.removeFromWishlist(req.user.id, req.params.productId); res.success(null, 'Removed from wishlist'); });

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
