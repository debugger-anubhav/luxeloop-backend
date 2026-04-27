const { Router } = require('express');
const controller = require('./categories.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/',        controller.getCategoryTree);
router.get('/:slug',   controller.getCategoryBySlug);
router.post('/',       authenticate, controller.createCategory);
router.patch('/:id',   authenticate, controller.updateCategory);
router.delete('/:id',  authenticate, controller.deleteCategory);

module.exports = router;
