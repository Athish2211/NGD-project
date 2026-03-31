/* eslint-disable no-console */
const path = require('path');
const https = require('https');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { query } = require('../config/database');
const Product = require('../models/Product');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ body: data, statusCode: res.statusCode, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });

    req.on('error', (err) => reject(err));
  });
}

function parseQuotesFromHtml(html) {
  const result = [];

  // First attempt: find inline JSON array containing quote entries if present.
  const inlineJsonMatch = html.match(/\[\s*\{[^]*?\}\s*\]/m);
  if (inlineJsonMatch) {
    try {
      const data = JSON.parse(inlineJsonMatch[0]);
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (item && typeof item === 'object') {
            const symbol = item.symbol || item.SYMBOL || item.contract || item.name;
            const ltp = item.ltp || item.lastPrice || item.last_price || item.price;
            if (symbol && ltp != null) {
              result.push({ symbol: String(symbol).trim(), price: parseFloat(String(ltp).replace(/,/, '')) });
            }
          }
        });
        if (result.length > 0) return result;
      }
    } catch (err) {
      // ignore, fallback to table parsing
    }
  }

  // Second attempt: parse first HTML table that has headers with symbol and price-like columns.
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  const tableHtml = tableMatch[1];
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (!rows || rows.length === 0) return result;

  let headerIndex = { symbol: -1, price: -1 };
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<(t[dh])[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2].replace(/<[^>]+>/g, '').trim());
    if (cells.length < 2) continue;

    if (headerIndex.symbol === -1) {
      const lowCells = cells.map((c) => c.toLowerCase());
      const symbolPos = lowCells.findIndex((c) => /(symbol|contract|instrument|script)/.test(c));
      const pricePos = lowCells.findIndex((c) => /(ltp|last price|last|price)/.test(c));
      if (symbolPos !== -1 && pricePos !== -1) {
        headerIndex = { symbol: symbolPos, price: pricePos };
        continue;
      }
    }

    if (headerIndex.symbol === -1 || headerIndex.price === -1) {
      continue;
    }

    const symbol = cells[headerIndex.symbol];
    const priceText = cells[headerIndex.price];
    const price = Number(String(priceText).replace(/[^0-9.\-]/g, ''));
    if (symbol && Number.isFinite(price)) {
      result.push({ symbol: symbol.trim(), price });
    }
  }

  return result;
}

async function fetchLiveQuotes() {
  const candidateUrls = [
    'https://ncdex.com/market-watch/live_quotes',
    'https://ncdex.com/market-watch/live_quotes?ajax=true',
    'https://ncdex.com/market-watch/live_quotes?json=true',
    'https://ncdex.com/json/market-watch/live_quotes',
    'https://ncdex.com/api/market-watch/live_quotes',
  ];

  for (const url of candidateUrls) {
    try {
      console.log(`Trying URL: ${url}`);
      const { body } = await fetchUrl(url);

      // If response is JSON
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed)) {
          return parsed
            .map((p) => ({
              symbol: p.symbol || p.SYMBOL || p.contract || p.name,
              price: parseFloat(String(p.ltp || p.lastPrice || p.price || p.last_price).replace(/,/, '')),
            }))
            .filter((p) => p.symbol && Number.isFinite(p.price));
        }
        if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data)) {
          return parsed.data
            .map((p) => ({
              symbol: p.symbol || p.SYMBOL || p.contract || p.name,
              price: parseFloat(String(p.ltp || p.lastPrice || p.price || p.last_price).replace(/,/, '')),
            }))
            .filter((p) => p.symbol && Number.isFinite(p.price));
        }
      } catch (_) {
        // not JSON, continue parsing HTML
      }

      const parsed = parseQuotesFromHtml(body);
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn(`Unable to fetch or parse from URL ${url}: ${err.message}`);
    }
  }

  return [];
}

function normaliseSymbol(symbol) {
  return String(symbol || '').trim().toLowerCase();
}

async function updateProductPrices() {
  const quotes = await fetchLiveQuotes();

  if (!quotes || quotes.length === 0) {
    console.log('No quotes were found; aborting price sync.');
    process.exitCode = 1;
    return;
  }

  const productCache = new Map();
  let updated = 0;

  for (const quote of quotes) {
    const sym = normaliseSymbol(quote.symbol);
    const price = Number(quote.price);
    if (!sym || !Number.isFinite(price)) continue;

    const searchPattern = `%${sym}%`;
    const matched = await query(`
      SELECT * FROM products
      WHERE is_active = TRUE
        AND (LOWER(name) LIKE $1 OR LOWER(sku) LIKE $1)
      LIMIT 20
    `, [searchPattern]);

    if (!matched.rows.length) continue;

    for (const product of matched.rows) {
      const oldPrice = Number(product.current_price);
      if (!Number.isFinite(oldPrice)) continue;

      if (Math.abs(oldPrice - price) >= 0.01) {
        await Product.update(product.id, { current_price: price });
        await Product.recordPriceChange(product.id, oldPrice, price, 0, `NCDEX live quote sync (${quote.symbol})`);
        updated += 1;
        console.log(`Updated product [${product.id}] ${product.name} (${product.sku || 'no-sku'}): ${oldPrice} -> ${price}`);
      }
    }

    productCache.set(sym, true);
  }

  console.log(`NCDEX sync complete. Quotes processed: ${quotes.length}, products updated: ${updated}`);
}

updateProductPrices()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error in NCDEX sync step:', err);
    process.exit(1);
  });
