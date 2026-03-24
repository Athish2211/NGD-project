#!/usr/bin/env node

// Test script to verify Redis data storage and retrieval
const { connectRedis } = require('./server/config/redis');
const { incrementCounter, setCache, getCache } = require('./server/config/redis');

async function testRedisData() {
  try {
    console.log('🔍 Testing Redis Data Storage and Retrieval...\n');
    
    // Connect to Redis
    const client = await connectRedis();
    
    // Test 1: Increment counters (views and purchases)
    console.log('📊 Test 1: Incrementing counters...');
    
    const viewKey = `views:1:${new Date().getHours()}`;
    const purchaseKey = `purchases:1:${new Date().getHours()}`;
    
    console.log(`Incrementing view key: ${viewKey}`);
    await incrementCounter(viewKey, 1);
    
    console.log(`Incrementing purchase key: ${purchaseKey}`);
    await incrementCounter(purchaseKey, 1);
    
    // Test 2: Retrieve counters
    console.log('\n📋 Test 2: Retrieving counters...');
    
    const views = await incrementCounter(viewKey, 0);
    const purchases = await incrementCounter(purchaseKey, 0);
    
    console.log(`Views retrieved: ${views}`);
    console.log(`Purchases retrieved: ${purchases}`);
    
    // Test 3: Set and get cache
    console.log('\n💾 Test 3: Setting and getting cache...');
    
    const testCacheKey = 'test:product:1';
    const testData = { id: 1, name: 'Test Product', price: 99.99 };
    
    await setCache(testCacheKey, testData, 300);
    const cached = await getCache(testCacheKey);
    
    console.log('Cache set:', testData);
    console.log('Cache retrieved:', cached);
    
    // Test 4: Simulate demand metrics
    console.log('\n📈 Test 4: Simulating demand metrics...');
    
    const demandKey = `demand:1`;
    const currentHour = new Date().getHours();
    const viewKey2 = `views:1:${currentHour}`;
    const purchaseKey2 = `purchases:1:${currentHour}`;
    
    // Increment multiple times to create data
    await incrementCounter(viewKey2, 5);  // 5 views
    await incrementCounter(purchaseKey2, 2);  // 2 purchases
    
    const views2 = await incrementCounter(viewKey2, 0);
    const purchases2 = await incrementCounter(purchaseKey2, 0);
    
    console.log(`Views for demand test: ${views2}`);
    console.log(`Purchases for demand test: ${purchases2}`);
    
    const demandScore = views2 * (purchases2 / views2);
    const demandMetrics = {
      views_last_hour: views2,
      purchases_last_hour: purchases2,
      demand_score: demandScore
    };
    
    await setCache(demandKey, demandMetrics, 300);
    const cachedDemand = await getCache(demandKey);
    
    console.log('Demand metrics calculated:', demandMetrics);
    console.log('Demand metrics cached:', cachedDemand);
    
    // Test 5: List all keys
    console.log('\n🔑 Test 5: Listing all Redis keys...');
    
    const keys = await client.keys('*');
    console.log(`Total keys in Redis: ${keys.length}`);
    console.log('All keys:');
    keys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
    
    // Test 6: Get specific values
    console.log('\n🔍 Test 6: Getting specific values...');
    
    for (const key of keys) {
      if (key.includes('views') || key.includes('purchases') || key.includes('demand')) {
        const type = await client.type(key);
        const value = await client.get(key);
        const ttl = await client.ttl(key);
        console.log(`  ${key} (${type}): ${value} (TTL: ${ttl}s)`);
      }
    }
    
    console.log('\n✅ Redis test completed!');
    console.log('\n📋 Summary:');
    console.log(`- Total keys: ${keys.length}`);
    console.log(`- View counters created: ${views2}`);
    console.log(`- Purchase counters created: ${purchases2}`);
    console.log(`- Demand metrics cached: ${cachedDemand ? 'Yes' : 'No'}`);
    
    await client.quit();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRedisData();
