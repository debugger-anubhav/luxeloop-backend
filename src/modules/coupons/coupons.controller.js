const asyncHandler = require('../../utils/asyncHandler');
const service = require('./coupons.service');

const validateCoupon = asyncHandler(async (req, res) => {
  const result = await service.validateCoupon(req.body.code, req.user.id, req.body.subtotal);
  res.success(result, 'Coupon is valid');
});

const getMyCoupons  = asyncHandler(async (req, res) => { res.success(await service.getMyCoupons(req.vendor.id), 'Coupons fetched'); });
const createCoupon  = asyncHandler(async (req, res) => { res.success(await service.createCoupon(req.body), 'Coupon created', 201); });
const updateCoupon  = asyncHandler(async (req, res) => { res.success(await service.updateCoupon(req.params.couponId, req.body), 'Coupon updated'); });
const deleteCoupon  = asyncHandler(async (req, res) => { await service.deleteCoupon(req.params.couponId); res.success(null, 'Coupon deleted'); });

module.exports = { validateCoupon, getMyCoupons, createCoupon, updateCoupon, deleteCoupon };
