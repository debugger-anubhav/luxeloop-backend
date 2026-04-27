require('dotenv').config();
const { pool } = require('../../config/db');
const logger = require('../../config/logger');

const categories = [
  { name: 'Women', slug: 'women', sort_order: 1, children: [
    { name: 'Sarees', slug: 'sarees', sort_order: 1 },
    { name: 'Lehengas', slug: 'lehengas', sort_order: 2 },
    { name: 'Anarkali Suits', slug: 'anarkali-suits', sort_order: 3 },
    { name: 'Gowns', slug: 'gowns', sort_order: 4 },
    { name: 'Salwar Kameez', slug: 'salwar-kameez', sort_order: 5 },
  ]},
  { name: 'Men', slug: 'men', sort_order: 2, children: [
    { name: 'Sherwanis', slug: 'sherwanis', sort_order: 1 },
    { name: 'Kurta Sets', slug: 'kurta-sets', sort_order: 2 },
    { name: 'Suits', slug: 'suits', sort_order: 3 },
    { name: 'Blazers', slug: 'blazers', sort_order: 4 },
  ]},
  { name: 'Kids', slug: 'kids', sort_order: 3, children: [
    { name: 'Boys', slug: 'kids-boys', sort_order: 1 },
    { name: 'Girls', slug: 'kids-girls', sort_order: 2 },
  ]},
  { name: 'Accessories', slug: 'accessories', sort_order: 4, children: [
    { name: 'Jewellery', slug: 'jewellery', sort_order: 1 },
    { name: 'Footwear', slug: 'footwear', sort_order: 2 },
    { name: 'Bags & Clutches', slug: 'bags-clutches', sort_order: 3 },
  ]},
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const cat of categories) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, sort_order) VALUES ($1,$2,$3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [cat.name, cat.slug, cat.sort_order]
      );
      const parentId = rows[0].id;
      if (cat.children) {
        for (const child of cat.children) {
          await client.query(
            `INSERT INTO categories (parent_id, name, slug, sort_order)
             VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
            [parentId, child.name, child.slug, child.sort_order]
          );
        }
      }
    }
    await client.query('COMMIT');
    logger.info('Categories seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Category seed failed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
