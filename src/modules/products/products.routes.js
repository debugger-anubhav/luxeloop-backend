const { Router } = require('express');
const controller = require('./products.controller');
const { authenticate } = require('../../middleware/auth');
const { requireVendor } = require('../../middleware/vendorAuth');
const validate = require('../../middleware/validate');
const { uploadMultiple } = require('../../middleware/upload');
const { createProductSchema } = require('./products.schema');

const router = Router();

router.get('/',                   controller.browseProducts);
router.get('/search',             controller.searchProducts);
router.get('/facets',             controller.getPLPFacets);
router.get('/:slug/availability',    controller.getVariantAvailability);
router.get('/:slug/recommendations', controller.getRecommendations);
router.get('/:slug',                 controller.getProductDetail);
router.post('/',          authenticate, requireVendor, validate(createProductSchema), controller.createProduct);
router.patch('/:id',      authenticate, requireVendor,                                controller.updateProduct);
router.delete('/:id',     authenticate, requireVendor,                                controller.deleteProduct);
router.post('/:id/images',        authenticate, requireVendor, ...uploadMultiple('images', 8), controller.uploadProductImages);
router.delete('/:id/images/:imageId', authenticate, requireVendor,                   controller.deleteProductImage);

module.exports = router;
