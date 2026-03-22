// Temporary database configuration for testing without PostgreSQL
const logger = require('../utils/logger');

// Mock database functions for testing
async function connectDB() {
  logger.warn('DATABASE NOT CONFIGURED - Running in mock mode');
  logger.warn('To use full functionality, please install PostgreSQL and update server/.env');
}

async function query(text, params) {
  logger.warn('Mock query called - DATABASE NOT CONFIGURED');
  return { rows: [] };
}

async function getClient() {
  logger.warn('Mock client requested - DATABASE NOT CONFIGURED');
  return {
    query: async () => ({ rows: [] }),
    release: () => {}
  };
}

const pool = null;

module.exports = {
  query,
  getClient,
  connectDB,
  pool
};
