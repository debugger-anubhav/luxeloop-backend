const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ApiError(400, 'Validation failed', errors);
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
