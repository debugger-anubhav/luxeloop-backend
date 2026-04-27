require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../../config/db');
const logger = require('../../config/logger');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('Password123!', 12);

    const { rows: adminRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ('Admin User', 'admin@vastra.in', $1, 'admin', TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [passwordHash]
    );
    const adminId = adminRows[0].id;
    logger.info({ adminId }, 'Admin user created');

    const { rows: vendorUserRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ('Demo Vendor', 'vendor@vastra.in', $1, 'vendor', TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [passwordHash]
    );
    const vendorUserId = vendorUserRows[0].id;

    const { rows: vendorRows } = await client.query(
      `INSERT INTO vendors (user_id, shop_name, slug, description, status, is_verified)
       VALUES ($1, 'Royal Threads', 'royal-threads', 'Premium ethnic wear for every occasion', 'active', TRUE)
       ON CONFLICT (user_id) DO UPDATE SET shop_name = EXCLUDED.shop_name RETURNING id`,
      [vendorUserId]
    );
    const vendorId = vendorRows[0].id;
    logger.info({ vendorId }, 'Demo vendor created');

    const { rows: customerRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ('Demo Customer', 'customer@vastra.in', $1, 'customer', TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [passwordHash]
    );
    const customerId = customerRows[0].id;
    logger.info({ customerId }, 'Demo customer created');

    const { rows: catRows } = await client.query(
      'SELECT id FROM categories WHERE slug = $1',
      ['sarees']
    );
    const categoryId = catRows[0]?.id;

    if (categoryId) {
      const { rows: productRows } = await client.query(
        `INSERT INTO products (vendor_id, category_id, name, slug, description, listing_type, deposit_amount, brand, fabric, tags)
         VALUES ($1,$2,'Banarasi Silk Saree','banarasi-silk-saree','Exquisite hand-woven Banarasi silk saree with gold zari work','both',2000,'Royal Threads','Silk',ARRAY['saree','silk','banarasi','wedding'])
         ON CONFLICT DO NOTHING RETURNING id`,
        [vendorId, categoryId]
      );

      if (productRows[0]) {
        const productId = productRows[0].id;
        await client.query(
          `INSERT INTO product_variants (product_id, size, color, color_hex, sku, rent_price_per_day, sale_price, stock_qty, available_qty)
           VALUES ($1, 'Free Size', 'Red', '#CC0000', 'BSS-RED-001', 500, 15000, 5, 5)
           ON CONFLICT (sku) DO NOTHING`,
          [productId]
        );
        logger.info({ productId }, 'Demo product created');
      }
    }

    await client.query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, per_user_limit, applies_to)
       VALUES ('WELCOME10', '10% off on your first order', 'percent', 10, 500, 1, 'all')
       ON CONFLICT (code) DO NOTHING`
    );

    await client.query('COMMIT');
    logger.info('Demo seed completed successfully');
    logger.info('Login credentials: admin@vastra.in / vendor@vastra.in / customer@vastra.in — Password: Password123!');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Demo seed failed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
