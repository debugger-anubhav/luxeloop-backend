function parsePaginationParams(query) {
  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || 20;
  const sortBy = query.sortBy || null;
  const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;
  return { page, limit, offset, sortBy, sortOrder };
}

function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { parsePaginationParams, buildPaginationMeta };
