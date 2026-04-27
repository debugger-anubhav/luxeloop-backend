const asyncHandler = require('../../utils/asyncHandler');
const service = require('./rentals.service');

const getActiveRentals = asyncHandler(async (req, res) => {
  res.success(await service.getActiveRentals(req.user.id), 'Active rentals fetched');
});

const getOverdueRentals = asyncHandler(async (req, res) => {
  const { rentals, pagination } = await service.getOverdueRentals(req.vendor.id, req.query);
  res.paginated(rentals, pagination, 'Overdue rentals fetched');
});

const initiateReturn = asyncHandler(async (req, res) => {
  res.success(await service.initiateReturn(req.user.id, req.params.rentalId), 'Return initiated');
});

const confirmReturn = asyncHandler(async (req, res) => {
  res.success(await service.confirmReturn(req.params.rentalId, req.vendor.id, req.body), 'Return confirmed');
});

const extendRental = asyncHandler(async (req, res) => {
  res.success(await service.extendRental(req.user.id, req.params.rentalId, req.body), 'Rental extended');
});

module.exports = { getActiveRentals, getOverdueRentals, initiateReturn, confirmReturn, extendRental };
