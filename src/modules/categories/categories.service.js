const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { uniqueSlug } = require('../../utils/slugify');

async function getCategoryTree() {
  const { rows } = await query(
    `SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`
  );
  const map = {};
  rows.forEach((r) => (map[r.id] = { ...r, children: [] }));
  const tree = [];
  rows.forEach((r) => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else {
      tree.push(map[r.id]);
    }
  });
  return tree;
}

async function getCategoryBySlug(slug) {
  const { rows } = await query('SELECT * FROM categories WHERE slug = $1 AND is_active = TRUE', [slug]);
  if (!rows[0]) throw ApiError.notFound('Category not found');
  return rows[0];
}

async function createCategory(data) {
  const slug = await uniqueSlug(data.name, async (s) => {
    const r = await query('SELECT id FROM categories WHERE slug = $1', [s]);
    return r.rows.length > 0;
  });
  const { rows } = await query(
    `INSERT INTO categories (parent_id, name, slug, description, image_url, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.parent_id || null, data.name, slug, data.description || null, data.image_url || null, data.sort_order || 0]
  );
  return rows[0];
}

async function updateCategory(id, data) {
  const allowed = ['name','description','image_url','is_active','sort_order','parent_id'];
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(id);

  const { rows } = await query(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!rows[0]) throw ApiError.notFound('Category not found');
  return rows[0];
}

async function deleteCategory(id) {
  const { rows } = await query(
    'UPDATE categories SET is_active = FALSE WHERE id = $1 RETURNING id',
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('Category not found');
}

module.exports = { getCategoryTree, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
