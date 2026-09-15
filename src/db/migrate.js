require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const migrations = [
  '001_initial_schema.sql',
  '002_homepage_sections.sql',
  '003_products_slug_unique.sql',
  '004_category_show_on_homepage.sql',
  '005_banners.sql',
  '006_variant_is_default.sql',
  '007_availability_index.sql',
  '008_otp_phone_login.sql',
  '009_product_discount.sql',
  '010_dry_cleaning_fee.sql',
  '011_wishlist_variant.sql',
  '012_wishlist_revert_variant.sql',
  '013_address_geo_fields.sql',
  '014_vendor_pickup_address.sql',
];

async function run() {
  const pool = new Pool({ connectionString: url });

  // Create tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: applied } = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.map((r) => r.filename));

  await pool.end();

  for (const file of migrations) {
    if (appliedSet.has(file)) {
      console.log(`Skipping (already applied): ${file}`);
      continue;
    }

    const filePath = path.join(__dirname, 'migrations', file);
    console.log(`Running migration: ${file}`);
    try {
      execSync(`psql "${url}" -f "${filePath}"`, { stdio: 'inherit' });

      // Mark as applied
      const pool2 = new Pool({ connectionString: url });
      await pool2.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool2.end();

      console.log(`Done: ${file}\n`);
    } catch (err) {
      console.error(`Failed on: ${file}`);
      process.exit(1);
    }
  }

  console.log('All migrations up to date.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
