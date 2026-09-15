/**
 * Seeds blocked date ranges for Forest Green Mermaid Gown variants
 * so the PDP date picker availability feature can be tested.
 *
 * Creates a demo user + address if none exist, then inserts confirmed
 * orders with order_items covering the blocked ranges.
 *
 * Safe to re-run — skips if order_items for these variants already exist
 * in the target date ranges.
 */

require('dotenv').config();
const { pool } = require('../../config/db');

// Variant IDs from the seeded product
const VARIANTS = {
  XS: 'edde711c-ab8f-4ce1-9800-87d22b388141',
  S:  '5ee36eeb-70d4-430d-aead-68175fd99b4a',
  M:  '5344395d-f572-4e42-878e-38b69396a69a',
};

// Blocked ranges per variant — all in the near future
const BLOCKS = [
  { variantId: VARIANTS.XS, start: '2026-07-20', end: '2026-07-25' },
  { variantId: VARIANTS.XS, start: '2026-08-01', end: '2026-08-05' },
  { variantId: VARIANTS.S,  start: '2026-07-18', end: '2026-07-22' },
  { variantId: VARIANTS.M,  start: '2026-07-28', end: '2026-08-02' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Demo user ────────────────────────────────────────────────────────────
    let userId;
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = 'demo.renter@luxeloop.test'`
    );
    if (existingUser.rows[0]) {
      userId = existingUser.rows[0].id;
      console.log('Reusing existing demo user:', userId);
    } else {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_email_verified)
         VALUES ('demo.renter@luxeloop.test', 'seed-placeholder-hash', 'Demo Renter', 'customer', TRUE)
         RETURNING id`
      );
      userId = rows[0].id;
      console.log('Created demo user:', userId);
    }

    // ── 2. Address ──────────────────────────────────────────────────────────────
    let addressId;
    const existingAddr = await client.query(
      `SELECT id FROM addresses WHERE user_id = $1 LIMIT 1`, [userId]
    );
    if (existingAddr.rows[0]) {
      addressId = existingAddr.rows[0].id;
    } else {
      const { rows } = await client.query(
        `INSERT INTO addresses (user_id, label, full_name, phone, line1, city, state, pincode)
         VALUES ($1, 'Home', 'Demo Renter', '9999999999', '1 Test Lane', 'Mumbai', 'Maharashtra', '400001')
         RETURNING id`,
        [userId]
      );
      addressId = rows[0].id;
      console.log('Created address:', addressId);
    }

    // ── 3. Vendor for the product ────────────────────────────────────────────────
    const { rows: vendorRows } = await client.query(
      `SELECT v.id FROM vendors v
       JOIN products p ON p.vendor_id = v.id
       WHERE p.slug = 'forest-green-mermaid-gown'
       LIMIT 1`
    );
    if (!vendorRows[0]) throw new Error('Product forest-green-mermaid-gown not found');
    const vendorId = vendorRows[0].id;

    // ── 4. One order per blocked range ──────────────────────────────────────────
    for (const block of BLOCKS) {
      // Skip if this variant already has an order_item covering this range
      const existing = await client.query(
        `SELECT oi.id FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.variant_id = $1
           AND oi.rental_start = $2
           AND oi.rental_end   = $3
           AND o.status = 'confirmed'`,
        [block.variantId, block.start, block.end]
      );
      if (existing.rows[0]) {
        console.log(`Skipping existing block ${block.start}→${block.end} for variant ${block.variantId}`);
        continue;
      }

      const start = new Date(block.start);
      const end   = new Date(block.end);
      const days  = Math.round((end - start) / (1000 * 60 * 60 * 24));
      const unitPrice = 3500;
      const lineTotal = unitPrice * days;

      const snapshot = { name: 'Forest Green Mermaid Gown', variant_id: block.variantId };

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders
           (user_id, address_id, status, type, subtotal, total_amount, delivery_address)
         VALUES ($1, $2, 'confirmed', 'rent', $3, $3, $4)
         RETURNING id`,
        [userId, addressId, lineTotal, JSON.stringify(snapshot)]
      );
      const orderId = orderRows[0].id;

      await client.query(
        `INSERT INTO order_items
           (order_id, variant_id, vendor_id, item_type, quantity, unit_price,
            rental_days, rental_start, rental_end, line_total, product_snapshot)
         VALUES ($1, $2, $3, 'rent', 1, $4, $5, $6, $7, $8, $9)`,
        [orderId, block.variantId, vendorId, unitPrice, days,
         block.start, block.end, lineTotal, JSON.stringify(snapshot)]
      );

      console.log(`Blocked ${block.start} → ${block.end} for variant ${block.variantId}`);
    }

    await client.query('COMMIT');
    console.log('\nDone. Blocked date ranges inserted.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
