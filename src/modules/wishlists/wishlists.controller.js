const asyncHandler = require('../../utils/asyncHandler');
const service = require('./wishlists.service');

const getWishlist        = asyncHandler(async (req, res) => { res.success(await service.getWishlist(req.user.id), 'Wishlist fetched'); });
const addToWishlist      = asyncHandler(async (req, res) => { res.success(await service.addToWishlist(req.user.id, req.params.productId), 'Added to wishlist', 201); });
const removeFromWishlist = asyncHandler(async (req, res) => { await service.removeFromWishlist(req.user.id, req.params.productId); res.success(null, 'Removed from wishlist'); });

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
