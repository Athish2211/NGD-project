#!/usr/bin/env node

// Script to add test data to Redis for testing
const { connectRedis } = require('./server/config/redis');
const { incrementCounter, setCache } = require('./server/config/redis');

async function addTestData() {
  try {
    console.log('🚀 Adding test data to Redis...\n');
    
    // Connect to Redis
    await connectRedis();
    
    const currentHour = new Date().getHours();
    
    // Add test view data for product 1
    console.log('📊 Adding view data for product 1...');
    const viewKey = `views:1:${currentHour}`;
    await incrementCounter(viewKey, 10);
    
    // Add test purchase data for product 1
    console.log('💰 Adding purchase data for product 1...');
    const purchaseKey = `purchases:1:${currentHour}`;
    await incrementCounter(purchaseKey, 3);
    
    // Add test demand metrics for product 1
    console.log('📈 Adding demand metrics for product 1...');
    const demandKey = 'demand:1';
    const demandMetrics = {
      views_last_hour: 10,
      purchases_last_hour: 3,
      demand_score: 0.3
    };
    await setCache(demandKey, demandMetrics, 300);
    
    // Add test data for product 2
    console.log('📊 Adding view data for product 2...');
    const viewKey2 = `views:2:${currentHour}`;
    await incrementCounter(viewKey2, 5);
    
    console.log('💰 Adding purchase data for product 2...');
    const purchaseKey2 = `purchases:2:${currentHour}`;
    await incrementCounter(purchaseKey2, 1);
    
    console.log('📈 Adding demand metrics for product 2...');
    const demandKey2 = 'demand:2';
    const demandMetrics2 = {
      views_last_hour: 5,
      purchases_last_hour: 1,
      demand_score: 0.2
    };
    await setCache(demandKey2, demandMetrics2, 300);
    
    // Add test data for product 3
    console.log('📊 Adding view data for product 3...');
    const viewKey3 = `views:3:${currentHour}`;
    await incrementCounter(viewKey3, 7);
    
    console.log('💰 Adding purchase data for product 3...');
    const purchaseKey3 = `purchases:3:${currentHour}`;
    await incrementCounter(purchaseKey3, 2);
    
    console.log('📈 Adding demand metrics for product 3...');
    const demandKey3 = 'demand:3';
    const demandMetrics3 = {
      views_last_hour: 7,
      purchases_last_hour: 2,
      demand_score: 0.29
    };
    await setCache(demandKey3, demandMetrics3, 300);
    
    console.log('\n✅ Test data added to Redis!');
    console.log('\n📋 Summary of added data:');
    console.log(`- Product 1: 10 views, 3 purchases, demand score: 0.3`);
    console.log(`- Product 2: 5 views, 1 purchase, demand score: 0.2`);
    console.log(`- Product 3: 7 views, 2 purchases, demand score: 0.29`);
    console.log('\n🔍 You can now check this data in Redis Insight or Redis Desktop Manager');
    console.log('\n⏰ Data will expire in 5 minutes (300 seconds)');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to add test data:', error);
    process.exit(1);
  }
}

// Run the script
addTestData();
