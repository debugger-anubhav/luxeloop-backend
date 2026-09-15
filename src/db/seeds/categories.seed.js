require('dotenv').config();
const { pool } = require('../../config/db');
const logger = require('../../config/logger');

const categories = [
  {
    name: 'Bridal Wear', slug: 'bridal-wear', sort_order: 1, show_on_homepage: true,
    description: 'Exquisite bridal collections for the most special day',
    image_url: 'https://images.unsplash.com/photo-1610189844534-9e580d4e35a0?w=400&q=80',
    children: [
      { name: 'Lehengas',       slug: 'lehengas',       sort_order: 1, description: 'Hand-embroidered lehengas from India\'s finest ateliers, crafted for the bride who commands every room.' },
      { name: 'Sarees',         slug: 'sarees',         sort_order: 2, description: 'Six yards of timeless elegance — from Kanjivaram silks to sheer organzas, for every wedding ceremony.' },
      { name: 'Gowns',          slug: 'gowns',          sort_order: 3, description: 'Couture gowns that blend Indian heritage with contemporary silhouettes, perfect for receptions and cocktail evenings.' },
      { name: 'Anarkali Suits', slug: 'anarkali-suits', sort_order: 4, description: 'Floor-sweeping Anarkalis in luxe fabrics and intricate embroidery, for the bride who loves regal grace.' },
      { name: 'Sharara Sets',   slug: 'sharara-sets',   sort_order: 5, description: 'Flared sharara sets with delicate craftsmanship — a contemporary twist on classic bridal dressing.' },
    ],
  },
  {
    name: 'Groom Wear', slug: 'groom-wear', sort_order: 2, show_on_homepage: true,
    description: 'Regal ensembles for the groom and his entourage',
    image_url: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&q=80',
    children: [
      { name: 'Sherwanis',       slug: 'sherwanis',      sort_order: 1, description: 'Masterfully tailored sherwanis in rich brocades, velvets and silks — for the groom who dresses like royalty.' },
      { name: 'Kurta Sets',      slug: 'kurta-sets',     sort_order: 2, description: 'Refined kurta sets in premium fabrics for the groom and his groomsmen across every pre-wedding function.' },
      { name: 'Suits & Blazers', slug: 'suits-blazers',  sort_order: 3, description: 'Sharply tailored Indo-western suits and blazers for the modern groom who blends tradition with style.' },
      { name: 'Indo-Western',    slug: 'indo-western',   sort_order: 4, description: 'The best of both worlds — contemporary cuts with Indian embellishments for a truly distinctive look.' },
    ],
  },
  {
    name: 'Kids Wear', slug: 'kids-wear', sort_order: 3,
    description: 'Adorable ethnic wear for little ones',
    image_url: null,
    children: [
      { name: 'Girls', slug: 'kids-girls', sort_order: 1, description: 'Enchanting lehengas, frocks and salwar sets for little girls who deserve to shine at every celebration.' },
      { name: 'Boys',  slug: 'kids-boys',  sort_order: 2, description: 'Dapper sherwanis, kurta pyjamas and Indo-western sets for little gentlemen at every wedding function.' },
    ],
  },
  {
    name: 'Accessories', slug: 'accessories', sort_order: 4,
    description: 'Complete your look with curated bridal accessories',
    image_url: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400&q=80',
    children: [
      { name: 'Jewellery',       slug: 'jewellery',      sort_order: 1, description: 'Polki, kundan, temple and contemporary jewellery sets curated from India\'s finest jewellers for your bridal trousseau.' },
      { name: 'Footwear',        slug: 'footwear',       sort_order: 2, description: 'Embroidered juttis, embellished heels and bridal sandals to complete your wedding look from head to toe.' },
      { name: 'Bags & Clutches', slug: 'bags-clutches',  sort_order: 3, description: 'Handcrafted potlis, zardozi clutches and embellished minaudieres for the finishing touch on your bridal ensemble.' },
      { name: 'Dupattas',        slug: 'dupattas',       sort_order: 4, description: 'Heirloom-quality dupattas in silk, organza and net with intricate borders — the perfect drape for any occasion.' },
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const cat of categories) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, description, sort_order, show_on_homepage, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE
           SET name             = EXCLUDED.name,
               description      = EXCLUDED.description,
               sort_order       = EXCLUDED.sort_order,
               show_on_homepage = EXCLUDED.show_on_homepage,
               image_url        = EXCLUDED.image_url
         RETURNING id`,
        [cat.name, cat.slug, cat.description ?? null, cat.sort_order, cat.show_on_homepage ?? false, cat.image_url ?? null]
      );
      const parentId = rows[0].id;

      for (const child of cat.children ?? []) {
        await client.query(
          `INSERT INTO categories (parent_id, name, slug, sort_order, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (slug) DO UPDATE
             SET name        = EXCLUDED.name,
                 parent_id   = EXCLUDED.parent_id,
                 sort_order  = EXCLUDED.sort_order,
                 description = EXCLUDED.description`,
          [parentId, child.name, child.slug, child.sort_order, child.description ?? null]
        );
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
