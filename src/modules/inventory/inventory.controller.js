const asyncHandler = require('../../utils/asyncHandler');
const service = require('./inventory.service');

const getVariantInventory = asyncHandler(async (req, res) => {
  res.success(await service.getVariantInventory(req.vendor.id, req.params.variantId), 'Inventory fetched');
});

const adjustStock = asyncHandler(async (req, res) => {
  res.success(await service.adjustStock(req.vendor.id, req.params.variantId, req.body), 'Stock adjusted');
});

module.exports = { getVariantInventory, adjustStock };
