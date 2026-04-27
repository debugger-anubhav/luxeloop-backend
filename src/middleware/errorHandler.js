const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [],
  });
}

module.exports = errorHandler;
