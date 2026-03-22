const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const logger = require('../utils/logger');

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    
    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await query(schema);
    
    logger.info('Database schema created successfully');
    
    // Check if we need to seed data
    const categoriesCount = await query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesCount.rows[0].count) === 0) {
      logger.info('Seeding initial data...');
      await seedDatabase();
    }
    
    logger.info('Database setup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  const client = await require('../config/database').getClient();
  
  try {
    await client.query('BEGIN');
    
    // Insert categories
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Fashion and apparel' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
      { name: 'Sports', description: 'Sports equipment and gear' },
      { name: 'Books', description: 'Books and educational materials' }
    ];
    
    for (const category of categories) {
      await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2)',
        [category.name, category.description]
      );
    }
    
    // Insert sample products
    const products = [
      {
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        category_id: 1,
        base_price: 99.99,
        current_price: 99.99,
        min_price: 79.99,
        max_price: 149.99,
        stock_quantity: 50,
        sku: 'WH-001',
        image_url: 'https://picsum.photos/seed/headphones/400/300.jpg'
      },
      {
        name: 'Smart Watch',
        description: 'Fitness tracking smartwatch with heart rate monitor',
        category_id: 1,
        base_price: 199.99,
        current_price: 199.99,
        min_price: 179.99,
        max_price: 249.99,
        stock_quantity: 30,
        sku: 'SW-002',
        image_url: 'https://picsum.photos/seed/smartwatch/400/300.jpg'
      },
      {
        name: 'Running Shoes',
        description: 'Professional running shoes for athletes',
        category_id: 4,
        base_price: 89.99,
        current_price: 89.99,
        min_price: 69.99,
        max_price: 119.99,
        stock_quantity: 75,
        sku: 'RS-003',
        image_url: 'https://picsum.photos/seed/shoes/400/300.jpg'
      },
      {
        name: 'Yoga Mat',
        description: 'Non-slip exercise yoga mat',
        category_id: 4,
        base_price: 29.99,
        current_price: 29.99,
        min_price: 19.99,
        max_price: 39.99,
        stock_quantity: 100,
        sku: 'YM-004',
        image_url: 'https://picsum.photos/seed/yogamat/400/300.jpg'
      },
      {
        name: 'Coffee Maker',
        description: 'Automatic drip coffee maker with timer',
        category_id: 3,
        base_price: 49.99,
        current_price: 49.99,
        min_price: 39.99,
        max_price: 69.99,
        stock_quantity: 40,
        sku: 'CM-005',
        image_url: 'https://picsum.photos/seed/coffee/400/300.jpg'
      },
      {
        name: 'Desk Lamp',
        description: 'LED desk lamp with adjustable brightness',
        category_id: 3,
        base_price: 34.99,
        current_price: 34.99,
        min_price: 24.99,
        max_price: 44.99,
        stock_quantity: 60,
        sku: 'DL-006',
        image_url: 'https://picsum.photos/seed/lamp/400/300.jpg'
      },
      {
        name: 'Winter Jacket',
        description: 'Warm winter jacket with waterproof coating',
        category_id: 2,
        base_price: 129.99,
        current_price: 129.99,
        min_price: 99.99,
        max_price: 179.99,
        stock_quantity: 25,
        sku: 'WJ-007',
        image_url: 'https://picsum.photos/seed/jacket/400/300.jpg'
      },
      {
        name: 'Programming Book',
        description: 'Complete guide to modern programming',
        category_id: 5,
        base_price: 39.99,
        current_price: 39.99,
        min_price: 29.99,
        max_price: 49.99,
        stock_quantity: 80,
        sku: 'PB-008',
        image_url: 'https://picsum.photos/seed/book/400/300.jpg'
      }
    ];
    
    for (const product of products) {
      await client.query(`
        INSERT INTO products (name, description, category_id, base_price, current_price, 
        min_price, max_price, stock_quantity, sku, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        product.name, product.description, product.category_id, product.base_price,
        product.current_price, product.min_price, product.max_price, product.stock_quantity,
        product.sku, product.image_url
      ]);
    }
    
    // Insert competitor prices
    const competitorPrices = [
      { product_id: 1, competitor_name: 'TechStore', price: 94.99 },
      { product_id: 1, competitor_name: 'ElectroHub', price: 104.99 },
      { product_id: 2, competitor_name: 'TechStore', price: 189.99 },
      { product_id: 2, competitor_name: 'SmartGear', price: 209.99 },
      { product_id: 3, competitor_name: 'SportsPlus', price: 84.99 },
      { product_id: 3, competitor_name: 'FitWorld', price: 94.99 }
    ];
    
    for (const comp of competitorPrices) {
      await client.query(
        'INSERT INTO competitor_prices (product_id, competitor_name, price) VALUES ($1, $2, $3)',
        [comp.product_id, comp.competitor_name, comp.price]
      );
    }
    
    await client.query('COMMIT');
    logger.info('Sample data seeded successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase, seedDatabase };
