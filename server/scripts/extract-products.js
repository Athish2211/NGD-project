/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Pool } = require('pg');
const redis = require('redis');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

function getArg(name, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defaultValue;
}

function slugify(input) {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return s || 'item';
}

async function downloadJson(url) {
  const client = url.startsWith('https://') ? https : http;

  return new Promise((resolve, reject) => {
    client
      .get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Failed to download dataset. HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Dataset JSON parse failed: ${e.message}`));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function normalizeDatasetJson(raw) {
  // Support a few common wrappers: { products: [] }, { data: [] }, or raw array.
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.products)) return raw.products;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function toNumber(value) {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function safeString(value, maxLen = 1000) {
  const s = value === null || value === undefined ? '' : String(value);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

async function main() {
  const datasetUrl = getArg('dataset-url', process.env.PRODUCTS_DATASET_URL);
  const datasetFile = getArg('dataset-file', process.env.PRODUCTS_DATASET_FILE);

  const deactivateMissing = String(getArg('deactivate-missing', process.env.DEACTIVATE_MISSING) ?? '')
    .toLowerCase()
    .trim() === 'true';

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Missing DATABASE_URL. Set it via Jenkins env or Docker env.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const defaultDatasetPath = path.join(__dirname, 'datasets', 'indian_products_sample.json');

  let rawDataset;
  if (datasetUrl) {
    console.log(`Downloading dataset from URL: ${datasetUrl}`);
    rawDataset = await downloadJson(datasetUrl);
  } else {
    const resolved = datasetFile ? path.resolve(datasetFile) : defaultDatasetPath;
    console.log(`Loading dataset from file: ${resolved}`);
    rawDataset = JSON.parse(await fs.promises.readFile(resolved, 'utf8'));
  }

  const dataset = normalizeDatasetJson(rawDataset);
  if (!dataset.length) {
    console.error('Dataset contained 0 product records; nothing to import.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Build a category name -> id map, creating categories as needed.
    const categoriesRes = await client.query('SELECT id, name FROM categories');
    const categoryByName = new Map(categoriesRes.rows.map((r) => [r.name, r.id]));

    const getCategoryId = async (categoryName) => {
      const name = safeString(categoryName, 100).trim() || 'Uncategorized';
      if (categoryByName.has(name)) return categoryByName.get(name);

      const desc = `Imported category: ${name}`;
      const inserted = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
        [name, desc],
      );
      const id = inserted.rows[0].id;
      categoryByName.set(name, id);
      return id;
    };

    const insertOrUpdateSql = `
      INSERT INTO products (
        name, description, category_id, base_price, current_price,
        min_price, max_price, stock_quantity, sku, image_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        base_price = EXCLUDED.base_price,
        current_price = EXCLUDED.current_price,
        min_price = EXCLUDED.min_price,
        max_price = EXCLUDED.max_price,
        stock_quantity = EXCLUDED.stock_quantity,
        image_url = EXCLUDED.image_url,
        is_active = true
      RETURNING (xmax = 0) AS inserted
    `;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const seenSkus = new Set();

    for (const item of dataset) {
      const name = safeString(item.name ?? item.title ?? item.product_name ?? item.product ?? item.brand ?? 'Unnamed');
      const category = item.category ?? item.category_name ?? item.main_category ?? 'Electronics';

      const imageUrl = safeString(
        item.image_url ?? item.imageUrl ?? item.image ?? item.img ?? item.image_link ?? '',
        500,
      );

      const basePrice = toNumber(item.base_price ?? item.basePrice ?? item.original_price ?? item.list_price ?? item.price);
      const currentPrice = toNumber(item.current_price ?? item.currentPrice ?? item.offer_price ?? item.sale_price ?? item.price) ?? basePrice;

      if (basePrice === undefined && currentPrice === undefined) {
        skippedCount++;
        continue;
      }

      const base = basePrice ?? currentPrice;
      const current = currentPrice ?? base;

      const minPrice = toNumber(item.min_price ?? item.minPrice) ?? base * 0.85;
      const maxPrice = toNumber(item.max_price ?? item.maxPrice) ?? base * 1.2;

      const stockQuantity = Math.max(
        0,
        Math.floor(
          toNumber(item.inventory ?? item.stock_quantity ?? item.stock ?? item.quantity ?? Math.random() * 150) ?? Math.random() * 150,
        ),
      );

      const externalId = item.id ?? item.product_id ?? item.sku ?? item.asin ?? item.upc ?? `${name}:${category}`;
      const sku = `${slugify(category).slice(0, 30)}:${slugify(externalId).slice(0, 60)}`.slice(0, 100);

      if (!sku || sku.length < 3) {
        skippedCount++;
        continue;
      }

      seenSkus.add(sku);

      const categoryId = await getCategoryId(category);

      const description =
        safeString(item.description ?? item.details ?? item.long_description ?? item.features ?? '', 2000) ||
        `${name} (${String(category)})`;

      const values = [
        name,
        description,
        categoryId,
        base,
        current,
        minPrice,
        maxPrice,
        stockQuantity,
        sku,
        imageUrl,
      ];

      // eslint-disable-next-line no-await-in-loop
      const res = await client.query(insertOrUpdateSql, values);
      const didInsert = Boolean(res.rows?.[0]?.inserted);
      if (didInsert) insertedCount++;
      else updatedCount++;
    }

    let deactivatedCount = 0;
    if (deactivateMissing && seenSkus.size > 0) {
      // Mark products inactive that are NOT in the newly imported dataset.
      // Note: we rely on SKU uniqueness.
      const skus = Array.from(seenSkus);
      const placeholders = skus.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `UPDATE products SET is_active = false WHERE sku NOT IN (${placeholders})`;
      const res = await client.query(sql, skus);
      deactivatedCount = res.rowCount ?? 0;
    }

    await client.query('COMMIT');

    // Clear Redis caches so the frontend sees updated images/prices immediately.
    // This is intentionally best-effort (import should still succeed if Redis is down).
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const r = redis.createClient({ url: redisUrl });
      r.on('error', () => {});
      await r.connect();

      const patterns = ['products:*', 'product:*', 'orders:user:*', 'order:*'];

      for (const pattern of patterns) {
        let cursor = 0;
        do {
          // SCAN is incremental and avoids blocking Redis like KEYS would.
          const res = await r.scan(cursor, { MATCH: pattern, COUNT: 100 });
          cursor = Number(res.cursor);
          for (const key of res.keys) {
            await r.del(key);
          }
        } while (cursor !== 0);
      }

      await r.quit();
    } catch (cacheErr) {
      console.warn('Redis cache clear skipped:', cacheErr?.message || cacheErr);
    }

    console.log(
      JSON.stringify(
        {
          datasetRecords: dataset.length,
          importedProducts: insertedCount + updatedCount,
          inserted: insertedCount,
          updated: updatedCount,
          skipped: skippedCount,
          deactivated: deactivatedCount,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Extraction/import failed:', e);
    process.exitCode = 1;
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));

