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
       VALUES ('Admin User', 'admin@luxeloop.in', $1, 'admin', TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [passwordHash]
    );
    const adminId = adminRows[0].id;
    logger.info({ adminId }, 'Admin user created');

    const { rows: vendorUserRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ('Demo Vendor', 'vendor@luxeloop.in', $1, 'vendor', TRUE)
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

    // Upsert vendor pickup address (uses vendor's user_id since addresses.user_id is NOT NULL)
    const { rows: pickupRows } = await client.query(
      `INSERT INTO addresses (user_id, label, full_name, phone, line1, city, state, pincode, country, lat, lng, full_address, is_default)
       VALUES ($1, 'pickup', 'Royal Threads', '9999999999', 'Taj City Centre Mall', 'Gurgaon', 'Haryana', '122003', 'India', 28.45567, 77.0705, 'Taj City Centre Gurgaon', TRUE)
       ON CONFLICT DO NOTHING RETURNING id`,
      [vendorUserId]
    );
    let pickupAddressId = pickupRows[0]?.id;
    if (!pickupAddressId) {
      const { rows: existing } = await client.query(
        `SELECT a.id FROM addresses a
         JOIN vendors v ON v.pickup_address_id = a.id
         WHERE v.id = $1`,
        [vendorId]
      );
      if (existing[0]) {
        await client.query(
          `UPDATE addresses SET lat=28.45567, lng=77.0705, full_address='Taj City Centre Gurgaon',
           line1='Taj City Centre Mall', city='Gurgaon', state='Haryana', pincode='122003', country='India'
           WHERE id=$1`,
          [existing[0].id]
        );
        pickupAddressId = existing[0].id;
      }
    }
    if (pickupAddressId) {
      await client.query('UPDATE vendors SET pickup_address_id=$1 WHERE id=$2', [pickupAddressId, vendorId]);
      logger.info({ pickupAddressId }, 'Vendor pickup address set');
    }

    const { rows: customerRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified)
       VALUES ('Demo Customer', 'customer@luxeloop.in', $1, 'customer', TRUE)
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
      [passwordHash]
    );
    const customerId = customerRows[0].id;
    logger.info({ customerId }, 'Demo customer created');

    // Seed a demo product under Lehengas (sub-category of Bridal Wear)
    const { rows: catRows } = await client.query(
      'SELECT id FROM categories WHERE slug = $1',
      ['lehengas']
    );
    const categoryId = catRows[0]?.id;

    if (!categoryId) {
      logger.warn('Lehengas category not found — run categories.seed.js first, then re-run this seed');
    } else {
      const { rows: existingProduct } = await client.query(
        `SELECT id FROM products WHERE slug = 'crimson-zardozi-lehenga'`
      );

      let productId = existingProduct[0]?.id;

      if (!productId) {
        const { rows: productRows } = await client.query(
          `INSERT INTO products
             (vendor_id, category_id, name, slug, description, listing_type,
              deposit_amount, brand, fabric, tags, is_featured, is_designer_pick)
           VALUES
             ($1, $2,
              'Crimson Zardozi Lehenga', 'crimson-zardozi-lehenga',
              'Hand-embroidered crimson lehenga with gold zardozi work, perfect for the wedding day',
              'both', 5000, 'Royal Threads', 'Silk',
              ARRAY['lehenga','bridal','zardozi','silk','wedding'],
              TRUE, TRUE)
           RETURNING id`,
          [vendorId, categoryId]
        );
        productId = productRows[0].id;
      }

      if (productId) {
        await client.query(
          `INSERT INTO product_variants
             (product_id, size, color, color_hex, sku, rent_price_per_day, sale_price, stock_qty, available_qty)
           VALUES
             ($1, 'S',  'Crimson', '#DC143C', 'CZL-S-001',  1500, 45000, 2, 2),
             ($1, 'M',  'Crimson', '#DC143C', 'CZL-M-001',  1500, 45000, 3, 3),
             ($1, 'L',  'Crimson', '#DC143C', 'CZL-L-001',  1500, 45000, 2, 2),
             ($1, 'XL', 'Crimson', '#DC143C', 'CZL-XL-001', 1500, 45000, 1, 1)
           ON CONFLICT (sku) DO NOTHING`,
          [productId]
        );
        logger.info({ productId }, 'Demo product created');
      }
    }

    await client.query(
      `INSERT INTO coupons
         (code, description, discount_type, discount_value, min_order_value, per_user_limit, applies_to)
       VALUES
         ('LUXE10',   '10% off on your first order',        'percent', 10, 1000, 1, 'all'),
         ('BRIDE500', 'Flat ₹500 off on bridal wear rental', 'flat',   500, 3000, 1, 'rent')
       ON CONFLICT (code) DO NOTHING`
    );

    await client.query('COMMIT');
    logger.info('Demo seed completed successfully');
    logger.info('Login credentials: admin@luxeloop.in / vendor@luxeloop.in / customer@luxeloop.in — Password: Password123!');
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
