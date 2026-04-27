const asyncHandler = require('../../utils/asyncHandler');
const service = require('./addresses.service');

const getMyAddresses    = asyncHandler(async (req, res) => { res.success(await service.getMyAddresses(req.user.id), 'Addresses fetched'); });
const createAddress     = asyncHandler(async (req, res) => { res.success(await service.createAddress(req.user.id, req.body), 'Address created', 201); });
const updateAddress     = asyncHandler(async (req, res) => { res.success(await service.updateAddress(req.user.id, req.params.addressId, req.body), 'Address updated'); });
const deleteAddress     = asyncHandler(async (req, res) => { await service.deleteAddress(req.user.id, req.params.addressId); res.success(null, 'Address deleted'); });
const setDefaultAddress = asyncHandler(async (req, res) => { res.success(await service.setDefaultAddress(req.user.id, req.params.addressId), 'Default address set'); });

module.exports = { getMyAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
