const asyncHandler = require('../../utils/asyncHandler');
const service = require('./vendors.service');

const registerVendor         = asyncHandler(async (req, res) => { res.success(await service.registerVendor(req.user.id, req.body), 'Vendor registered', 201); });
const getMyVendorProfile     = asyncHandler(async (req, res) => { res.success(await service.getMyVendorProfile(req.vendor.id), 'Vendor profile fetched'); });
const updateVendorProfile    = asyncHandler(async (req, res) => { res.success(await service.updateVendorProfile(req.vendor.id, req.body), 'Vendor profile updated'); });
const setPickupAddress       = asyncHandler(async (req, res) => { res.success(await service.setPickupAddress(req.vendor.id, req.body), 'Pickup address saved'); });
const getVendorOrders        = asyncHandler(async (req, res) => { const { orders, pagination } = await service.getVendorOrders(req.vendor.id, req.query); res.paginated(orders, pagination, 'Vendor orders fetched'); });
const getVendorRentals       = asyncHandler(async (req, res) => { const { rentals, pagination } = await service.getVendorRentals(req.vendor.id, req.query); res.paginated(rentals, pagination, 'Vendor rentals fetched'); });
const getVendorAnalytics     = asyncHandler(async (req, res) => { res.success(await service.getVendorAnalytics(req.vendor.id), 'Analytics fetched'); });
const addBankAccount         = asyncHandler(async (req, res) => { res.success(await service.addBankAccount(req.vendor.id, req.body), 'Bank account added', 201); });
const getPublicVendorProfile = asyncHandler(async (req, res) => { res.success(await service.getPublicVendorProfile(req.params.vendorId), 'Vendor profile fetched'); });

module.exports = { registerVendor, getMyVendorProfile, updateVendorProfile, setPickupAddress, getVendorOrders, getVendorRentals, getVendorAnalytics, addBankAccount, getPublicVendorProfile };
