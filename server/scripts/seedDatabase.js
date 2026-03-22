const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    logger.info('Seeding database with initial data...');
    
    // Create demo user
    const demoUserPassword = await bcrypt.hash('demo123', 10);
    
    await query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['demo@example.com', demoUserPassword, 'Demo', 'User']);
    
    logger.info('Demo user created successfully');
    
    // Generate mock competitor prices if they don't exist
    const pricingEngine = require('../services/pricingEngine');
    await pricingEngine.generateMockCompetitorPrices();
    
    logger.info('Database seeding completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
