require('dotenv').config();
const { pool } = require('../../config/db');
const logger = require('../../config/logger');

const banners = [
  {
    title: 'The Wedding Edit 2025',
    subtitle: 'Handpicked luxury ensembles for your most cherished moments',
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
    cta_text: 'EXPLORE NOW',
    cta_link: '/collections/bridal-wear',
    sort_order: 1,
  },
  {
    title: 'The Groom\'s Atelier',
    subtitle: 'Regal sherwanis and bespoke kurta sets for the modern groom',
    image_url: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&q=80',
    cta_text: 'DISCOVER MORE',
    cta_link: '/collections/groom-wear',
    sort_order: 2,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const banner of banners) {
      await client.query(
        `INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [banner.title, banner.subtitle, banner.image_url, banner.cta_text, banner.cta_link, banner.sort_order]
      );
    }

    await client.query('COMMIT');
    logger.info('Banners seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Banners seed failed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
