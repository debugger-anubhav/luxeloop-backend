function attachResponseHelpers(req, res, next) {
  res.success = function (data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  };

  res.paginated = function (data, pagination, message = 'Success') {
    return res.status(200).json({ success: true, message, data, pagination });
  };

  next();
}

module.exports = { attachResponseHelpers };
