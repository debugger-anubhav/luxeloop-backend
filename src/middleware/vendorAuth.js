const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const requireVendor = asyncHandler(async (req, _res, next) => {
  const { rows } = await query(
    `SELECT * FROM vendors WHERE user_id = $1 AND status = 'active'`,
    [req.user.id]
  );
  if (!rows[0]) {
    throw ApiError.forbidden('Active vendor account required');
  }
  req.vendor = rows[0];
  next();
});

module.exports = { requireVendor };
