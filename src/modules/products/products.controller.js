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

module.exports = { browseProducts, searchProducts, getProductDetail, createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage };
