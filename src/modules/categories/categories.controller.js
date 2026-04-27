const asyncHandler = require('../../utils/asyncHandler');
const service = require('./categories.service');

const getCategoryTree    = asyncHandler(async (req, res) => { res.success(await service.getCategoryTree(), 'Categories fetched'); });
const getCategoryBySlug  = asyncHandler(async (req, res) => { res.success(await service.getCategoryBySlug(req.params.slug), 'Category fetched'); });
const createCategory     = asyncHandler(async (req, res) => { res.success(await service.createCategory(req.body), 'Category created', 201); });
const updateCategory     = asyncHandler(async (req, res) => { res.success(await service.updateCategory(req.params.id, req.body), 'Category updated'); });
const deleteCategory     = asyncHandler(async (req, res) => { await service.deleteCategory(req.params.id); res.success(null, 'Category deleted'); });

module.exports = { getCategoryTree, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
