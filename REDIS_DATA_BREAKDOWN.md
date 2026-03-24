# Redis Data Storage Breakdown

## 🎯 **What Redis Actually Stores**

Your dynamic pricing application uses Redis specifically for **demand tracking and caching** - not for user sessions, authentication, or shopping cart data.

---

## 📊 **1. Product View Tracking**

### Key Pattern: `views:{product_id}:{hour}`
```
views:1:14    # Product 1 views at 2 PM (hour 14)
views:2:14    # Product 2 views at 2 PM
views:1:15    # Product 1 views at 3 PM (hour 15)
```

### Data Structure:
- **Type**: String (stored as number)
- **Value**: Integer count of views
- **TTL**: 3600 seconds (1 hour)
- **Purpose**: Track hourly product views for demand scoring

### When Created:
```javascript
// When user views a product page
const hourKey = `views:${productId}:${new Date().getHours()}`;
await incrementCounter(hourKey);
```

---

## 💰 **2. Purchase Tracking**

### Key Pattern: `purchases:{product_id}:{hour}`
```
purchases:1:14    # Product 1 purchases at 2 PM
purchases:2:14    # Product 2 purchases at 2 PM
purchases:1:15    # Product 1 purchases at 3 PM
```

### Data Structure:
- **Type**: String (stored as number)
- **Value**: Integer count of purchases
- **TTL**: 3600 seconds (1 hour)
- **Purpose**: Track hourly purchases for demand scoring

### When Created:
```javascript
// When user completes checkout
const purchaseKey = `purchases:${productId}:${currentHour}`;
await incrementCounter(purchaseKey, 1);
```

---

## 📈 **3. Demand Metrics Cache**

### Key Pattern: `demand:{product_id}`
```
demand:1    # Demand metrics for product 1
demand:2    # Demand metrics for product 2
```

### Data Structure:
- **Type**: String (JSON object)
- **Value**: 
```json
{
  "views_last_hour": 25,
  "purchases_last_hour": 5,
  "demand_score": 5.0
}
```
- **TTL**: 300 seconds (5 minutes)
- **Purpose**: Cached demand calculations to avoid recomputing

### When Created:
```javascript
// Calculated from views and purchases
const demandMetrics = {
  views_last_hour: viewsLastHour,
  purchases_last_hour: purchasesLastHour,
  demand_score: viewsLastHour * (purchasesLastHour / viewsLastHour)
};
await setCache(demandKey, demandMetrics, 300);
```

---

## 🗄️ **4. Product Cache**

### Key Pattern: `products:{filters_hash}`
```
products:{}                    # All products (no filters)
products:{"category_id":1}     # Products in category 1
products:{"min_price":50}      # Products over $50
```

### Data Structure:
- **Type**: String (JSON array)
- **Value**: Array of product objects
- **TTL**: 300 seconds (5 minutes)
- **Purpose**: Cache database queries for performance

### When Created:
```javascript
// When fetching products with filters
const cacheKey = `products:${JSON.stringify(filters)}`;
await setCache(cacheKey, result.rows, 300);
```

---

## 🏷️ **5. Individual Product Cache**

### Key Pattern: `product:{product_id}`
```
product:1    # Product 1 details
product:2    # Product 2 details
```

### Data Structure:
- **Type**: String (JSON object)
- **Value**: Single product object
- **TTL**: 600 seconds (10 minutes)
- **Purpose**: Cache individual product lookups

---

## 📋 **What's NOT Stored in Redis**

### ❌ **User Authentication**
- No session tokens
- No user login data
- **Reason**: Uses localStorage + JWT tokens

### ❌ **Shopping Cart**
- No cart items
- No cart state
- **Reason**: Uses localStorage

### ❌ **Order History**
- No order data
- No transaction records
- **Reason**: Stored in PostgreSQL database

### ❌ **Real-time Price Updates**
- No WebSocket data
- No price change events
- **Reason**: WebSocket handles real-time communication

---

## 🔍 **Redis Data Flow**

### 1. User Views Product
```
User visits product page → 
incrementCounter("views:1:14") → 
Redis stores: views:1:14 = "5"
```

### 2. User Makes Purchase
```
User completes checkout → 
incrementCounter("purchases:1:14") → 
Redis stores: purchases:1:14 = "2"
```

### 3. Pricing Engine Runs
```
Every 3 minutes → 
getDemandMetrics(1) → 
Reads views:1:14 and purchases:1:14 → 
Calculates demand_score → 
Caches as demand:1 = "{...}"
```

### 4. Price Update Decision
```
Based on demand_score → 
If demand_score > threshold → 
Increase price → 
Update database → 
Notify clients via WebSocket
```

---

## 📊 **Example Redis State**

### After 1 Hour of Activity:
```
views:1:14 = "25"           # 25 views of product 1
views:2:14 = "18"           # 18 views of product 2
purchases:1:14 = "5"        # 5 purchases of product 1
purchases:2:14 = "2"        # 2 purchases of product 2
demand:1 = "{\"views_last_hour\":25,\"purchases_last_hour\":5,\"demand_score\":5.0}"
demand:2 = "{\"views_last_hour\":18,\"purchases_last_hour\":2,\"demand_score\":2.0}"
products:{} = "[{...product data...}]"
product:1 = "{...single product...}"
```

---

## 🎮 **Why This Design?**

### ✅ **Fast Counter Operations**
- Redis `INCR` is atomic and fast
- Perfect for tracking views/purchases

### ✅ **Automatic Expiration**
- Hourly data expires after 1 hour
- Cached data expires after 5-10 minutes
- No manual cleanup needed

### ✅ **Demand Calculations**
- Real-time demand scoring
- Cached to avoid repeated calculations
- Powers dynamic pricing decisions

### ✅ **Performance Caching**
- Product queries cached for 5 minutes
- Individual products cached for 10 minutes
- Reduces database load

---

## 🚀 **Current Redis Usage**

### Active Data Types:
1. **Counters**: ~50-100 keys (views/purchases per product per hour)
2. **Demand Cache**: ~5-10 keys (one per active product)
3. **Product Cache**: ~10-20 keys (various filter combinations)
4. **Individual Products**: ~5-10 keys (cached product details)

### Memory Usage:
- **Counters**: ~50 bytes each
- **Demand Cache**: ~200 bytes each
- **Product Cache**: ~1-5KB each
- **Total**: Typically < 100KB for small store

---

## 📈 **Why You Only See "Purchase and Views"**

**Because that's exactly what your app is designed to store in Redis!**

Your Redis instance is working perfectly - it's storing:
- ✅ Product view counters
- ✅ Purchase counters  
- ✅ Demand metrics
- ✅ Product cache

**Everything else** (users, orders, cart) is stored in PostgreSQL or localStorage by design.

This is a **smart architecture** - Redis for fast counters/caching, PostgreSQL for persistent data.
