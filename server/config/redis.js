const redis = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error('Redis connection error:', error);
    throw error;
  }
}

function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
}

// Helper functions for common Redis operations
async function setCache(key, value, ttl = 3600) {
  try {
    await client.setEx(key, ttl, JSON.stringify(value));
    logger.debug(`Cached data for key: ${key}`);
  } catch (error) {
    logger.error('Redis set error:', error);
  }
}

async function getCache(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
}

async function deleteCache(key) {
  try {
    if (typeof key === 'string' && key.includes('*')) {
      // deleteCache('products:*') expects wildcard behavior.
      // Implement using SCAN to avoid blocking Redis.
      let cursor = 0;
      let totalDeleted = 0;
      do {
        // eslint-disable-next-line no-await-in-loop
        const res = await client.scan(cursor, { MATCH: key, COUNT: 500 });
        cursor = Number(res.cursor);
        if (res.keys?.length) {
          // eslint-disable-next-line no-await-in-loop
          const delRes = await client.del(res.keys);
          totalDeleted += delRes ?? 0;
        }
      } while (cursor !== 0);

      logger.debug(`Deleted cache keys matching: ${key} (deleted ${totalDeleted})`);
      return totalDeleted;
    }

    await client.del(key);
    logger.debug(`Deleted cache for key: ${key}`);
    return 1;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return 0;
  }
}

async function incrementCounter(key, amount = 1) {
  try {
    const result = await client.incrBy(key, amount);
    logger.debug(`Incremented counter ${key} by ${amount}, new value: ${result}`);
    return result;
  } catch (error) {
    logger.error('Redis increment error:', error);
    return 0;
  }
}

async function getCounter(key) {
  try {
    const value = await client.get(key);
    const result = value ? parseInt(value) : 0;
    logger.debug(`Got counter ${key}: ${result}`);
    return result;
  } catch (error) {
    logger.error('Redis get counter error:', error);
    return 0;
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  incrementCounter,
  getCounter
};
