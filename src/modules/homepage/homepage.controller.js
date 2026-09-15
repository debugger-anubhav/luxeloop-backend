const { getHomepage } = require('./homepage.service');

async function homepage(req, res, next) {
  try {
    const data = await getHomepage();
    res.success(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { homepage };
