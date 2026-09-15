const { Router } = require('express');
const { homepage } = require('./homepage.controller');

const router = Router();

router.get('/', homepage);

module.exports = router;
