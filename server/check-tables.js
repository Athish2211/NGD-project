const { query } = require('./config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Check if pricing_history table exists
    const pricingHistoryResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_history'
      );
    `);
    
    console.log('📊 Pricing history table exists:', pricingHistoryResult.rows[0].exists);
    
    // Check if orders table exists
    const ordersResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);
    
    console.log('📦 Orders table exists:', ordersResult.rows[0].exists);
    
    // List all tables
    const allTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 All tables:', allTables.rows.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
