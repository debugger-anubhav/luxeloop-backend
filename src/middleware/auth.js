const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/tokenUtils');
const env = require('../config/env');

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed token');
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = verifyToken(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
  next();
});

module.exports = { authenticate };
