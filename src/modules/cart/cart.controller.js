const asyncHandler = require('../../utils/asyncHandler');
const service = require('./cart.service');

const getCart    = asyncHandler(async (req, res) => { res.success(await service.getCart(req.user.id), 'Cart fetched'); });
const addItem    = asyncHandler(async (req, res) => { res.success(await service.addItem(req.user.id, req.body), 'Item added to cart', 201); });
const updateItem = asyncHandler(async (req, res) => { res.success(await service.updateItem(req.user.id, req.params.itemId, req.body), 'Cart item updated'); });
const removeItem = asyncHandler(async (req, res) => { await service.removeItem(req.user.id, req.params.itemId); res.success(null, 'Item removed'); });
const clearCart  = asyncHandler(async (req, res) => { await service.clearCart(req.user.id); res.success(null, 'Cart cleared'); });

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
