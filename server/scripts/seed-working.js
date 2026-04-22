const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Seeding initial data...');
    
    // Insert demo user
    const demoUserPassword = await bcrypt.hash('demo123', 10);
    
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['demo@example.com', demoUserPassword, 'Demo', 'User']);
    
    console.log('✅ Demo user created');
    
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
    
    console.log('✅ Categories created');
    
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
    
    console.log('✅ Products created');
    
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
    
    console.log('✅ Competitor prices created');
    
    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
