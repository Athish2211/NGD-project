#!/usr/bin/env node

// Simple script to add Redis data without database dependency
const { connectRedis } = require('./server/config/redis');
const { incrementCounter, setCache } = require('./server/config/redis');

async function addRedisData() {
  try {
    console.log('🔧 Adding Redis data for pricing updates...\n');
    
    // Connect to Redis
    await connectRedis();
    
    const currentHour = new Date().getHours();
    
    // Add demand data for products 1-5 (assuming they exist)
    const productIds = [1, 2, 3, 4, 5];
    
    console.log('📊 Adding demand data to Redis...');
    
    for (const productId of productIds) {
      // Add realistic view and purchase data
      const views = Math.floor(Math.random() * 20) + 10; // 10-30 views
      const purchases = Math.floor(Math.random() * 5) + 2; // 2-7 purchases
      
      const viewKey = `views:${productId}:${currentHour}`;
      const purchaseKey = `purchases:${productId}:${currentHour}`;
      
      await incrementCounter(viewKey, views);
      await incrementCounter(purchaseKey, purchases);
      
      console.log(`  Product ${productId}: ${views} views, ${purchases} purchases`);
      
      // Cache demand metrics
      const demandScore = views * (purchases / views);
      const demandKey = `demand:${productId}`;
      const demandMetrics = {
        views_last_hour: views,
        purchases_last_hour: purchases,
        demand_score: demandScore
      };
      
      await setCache(demandKey, demandMetrics, 300);
    }
    
    console.log('\n✅ Redis data added successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Added demand data for ${productIds.length} products`);
    console.log(`- Current hour: ${currentHour}`);
    console.log(`- Data will expire in 5 minutes (300 seconds)`);
    console.log('\n🚀 The next pricing update should now update more products!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding Redis data:', error);
    process.exit(1);
  }
}

// Run the script
addRedisData();
