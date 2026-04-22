const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs').promises;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL!');
    
    // Check if tables already exist
    const tablesExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tablesExist.rows[0].exists) {
      console.log('✅ Database tables already exist - skipping schema creation');
    } else {
      console.log('📖 Reading schema file...');
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      console.log('✅ Schema file read successfully');
      
      console.log('🔧 Creating database schema...');
      await client.query(schema);
      console.log('✅ Database schema created!');
    }
    
    client.release();
    console.log('🎉 Database setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
