const asyncHandler = require('../../utils/asyncHandler');
const service = require('./products.service');

const browseProducts = asyncHandler(async (req, res) => {
  const { products, pagination } = await service.browseProducts(req.query);
  res.paginated(products, pagination, 'Products fetched');
});

const searchProducts = asyncHandler(async (req, res) => {
  const { products, pagination } = await service.searchProducts(req.query);
  res.paginated(products, pagination, 'Search results');
});

const getProductDetail = asyncHandler(async (req, res) => {
  res.success(await service.getProductDetail(req.params.slug), 'Product fetched');
});

const createProduct = asyncHandler(async (req, res) => {
  res.success(await service.createProduct(req.vendor.id, req.body), 'Product created', 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  res.success(await service.updateProduct(req.vendor.id, req.params.id, req.body), 'Product updated');
});

const deleteProduct = asyncHandler(async (req, res) => {
  await service.deleteProduct(req.vendor.id, req.params.id);
  res.success(null, 'Product deleted');
});

const uploadProductImages = asyncHandler(async (req, res) => {
  const images = await service.uploadProductImages(req.vendor.id, req.params.id, req.fileUrls || []);
  res.success(images, 'Images uploaded', 201);
});

const deleteProductImage = asyncHandler(async (req, res) => {
  await service.deleteProductImage(req.vendor.id, req.params.id, req.params.imageId);
  res.success(null, 'Image deleted');
});

const getVariantAvailability = asyncHandler(async (req, res) => {
  const { variant_id } = req.query;
  if (!variant_id) {
    return res.status(400).json({ success: false, message: 'variant_id is required' });
  }
  res.success(await service.getVariantAvailability(variant_id), 'Availability fetched');
});

const getRecommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '15', 10), 15);
  res.success(await service.getRecommendations(req.params.slug, limit), 'Recommendations fetched');
});

const getPLPFacets = asyncHandler(async (req, res) => {
  res.success(await service.getPLPFacets(req.query), 'Facets fetched');
});

module.exports = { browseProducts, searchProducts, getProductDetail, getVariantAvailability, getRecommendations, getPLPFacets, createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage };
