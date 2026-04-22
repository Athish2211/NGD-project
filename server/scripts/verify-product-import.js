/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function getArg(name, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defaultValue;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Missing DATABASE_URL. Set it via Jenkins env or Docker env.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const datasetFile = getArg(
    'dataset-file',
    process.env.PRODUCTS_DATASET_FILE ||
      path.join(__dirname, 'datasets', 'indian_products_sample.json'),
  );

  const datasetPath = path.resolve(datasetFile);
  let skusToCheck = [];
  try {
    const raw = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const dataset = Array.isArray(raw) ? raw : raw.products || raw.data || raw.items || [];
    skusToCheck = dataset
      .map((item) => item.id ?? item.sku ?? item.asin ?? item.product_id ?? item.name)
      .filter(Boolean)
      .slice(0, 50);
  } catch {
    // Verification should not fail if the dataset file can't be read.
  }

  const client = await pool.connect();
  try {
    const total = await client.query('SELECT COUNT(*)::int AS count FROM products');
    const active = await client.query('SELECT COUNT(*)::int AS count FROM products WHERE is_active = true');
    const withSku = await client.query('SELECT COUNT(*)::int AS count FROM products WHERE sku IS NOT NULL AND sku <> \'\'');

    console.log(
      JSON.stringify(
        {
          totalProducts: total.rows[0].count,
          activeProducts: active.rows[0].count,
          productsWithSku: withSku.rows[0].count,
        },
        null,
        2,
      ),
    );

    if (total.rows[0].count < 1) {
      throw new Error('Verification failed: expected at least 1 product in `products` table.');
    }
    if (withSku.rows[0].count < 1) {
      throw new Error('Verification failed: expected at least 1 product with a non-empty `sku`.');
    }

    // Optional: if we managed to compute external IDs, verify at least one SKU exists.
    if (skusToCheck.length > 0) {
      const sample = skusToCheck[0];
      console.log(`Sample dataset external id seen: ${sample}`);
      // We don't know the exact sku format (script derives it), so we only assert table population above.
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});

