# Complete Redis Data Guide - See Everything Stored

## What Your App Actually Stores

Based on the code analysis, your dynamic pricing app stores these specific Redis keys:

### 📊 **Data Categories Stored**

#### 1. Product Views & Purchases
```
Key Pattern: views:{product_id}:{hour}
Example: views:1:14 (product 1, 2 PM)
Value: Counter (number)

Key Pattern: purchases:{product_id}:{hour}  
Example: purchases:1:14 (product 1, 2 PM)
Value: Counter (number)
```

#### 2. Product Cache
```
Key Pattern: products:{filters_hash}
Example: products:{} (all products)
Value: JSON array of products (5 min TTL)

Key Pattern: product:{id}
Example: product:1
Value: JSON product details (10 min TTL)
```

#### 3. Demand Metrics
```
Key Pattern: demand:{product_id}
Example: demand:1
Value: JSON with demand_score, views, purchases (5 min TTL)
```

## 🔍 **How to See ALL Data**

### Method 1: Redis Desktop Manager
1. **Connect**: localhost:6379 (no password)
2. **Refresh Keys**: Click refresh or press F5
3. **Search Patterns**: Use search/filter to find keys
4. **Browse All**: Look for these specific patterns

### Method 2: Redis CLI Commands
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# See ALL keys (might be many)
KEYS *

# See specific data types
KEYS views:*
KEYS purchases:*
KEYS products:*
KEYS demand:*

# Get specific values
GET views:1:14
GET purchases:1:14
GET products:{}
GET demand:1
```

### Method 3. Browser-based Redis Tools
If you have Redis Insight or Redis Commander:
- Connect to localhost:6379
- Browse by key patterns
- Use key search functionality

## 📋 **Expected Key Patterns to Find**

### 1. View Tracking
```
views:1:0    # Product 1 views at midnight
views:1:1    # Product 1 views at 1 AM
views:1:2    # Product 1 views at 2 AM
...
views:2:14    # Product 2 views at 2 PM (current hour)
```

### 2. Purchase Tracking
```
purchases:1:0    # Product 1 purchases at midnight
purchases:1:1    # Product 1 purchases at 1 AM
...
purchases:2:14    # Product 2 purchases at 2 PM
```

### 3. Product Cache
```
products:{}          # All products cache
product:1           # Product 1 details
product:2           # Product 2 details
```

### 4. Demand Metrics
```
demand:1           # Demand metrics for product 1
demand:2           # Demand metrics for product 2
```

## 🎯 **Why You Only See Views & Purchases**

### Current App Behavior
Your app **only tracks**:
1. **Product Views** - When users view product pages
2. **Product Purchases** - When users complete purchases
3. **Product Cache** - Product details for performance
4. **Demand Metrics** - Calculated from views/purchases ratio

### What's NOT Stored
- **User sessions** (no session management implemented)
- **Authentication tokens** (using localStorage instead)
- **Shopping cart data** (using localStorage instead)
- **Real-time price updates** (WebSocket only, not Redis pub/sub)
- **Analytics aggregates** (calculated on-demand)

## 🔧 **Complete Redis Inspection**

### Step 1: Connect and List All Keys
```redis
redis-cli -h localhost -p 6379
KEYS *
```

### Step 2: Examine Each Category
```redis
# Check product views
KEYS views:*
GET views:1:14

# Check purchases  
KEYS purchases:*
GET purchases:1:14

# Check product cache
KEYS products:*
GET products:{}

# Check demand metrics
KEYS demand:*
GET demand:1
```

### Step 3: Monitor Real-time Activity
```redis
# Watch live activity (in separate terminal)
MONITOR

# You'll see commands like:
INCR views:1:14
INCR purchases:1:14
SET products:{} "[...product data...]"
SET demand:1 "{...metrics...}"
```

## 📊 **Data Format Examples**

### Views Counter
```
Key: views:1:14
Type: String (Redis stores as string)
Value: "5" (5 views in hour 14)
TTL: 3600 (1 hour)
```

### Purchases Counter  
```
Key: purchases:1:14
Type: String
Value: "2" (2 purchases in hour 14)  
TTL: 3600 (1 hour)
```

### Product Cache
```
Key: products:{}
Type: String
Value: "[{id:1,name:'Product 1',...},{id:2,name:'Product 2',...}]"
TTL: 300 (5 minutes)
```

### Demand Metrics
```
Key: demand:1
Type: String  
Value: "{\"demand_score\":0.15,\"views\":25,\"purchases\":3}"
TTL: 300 (5 minutes)
```

## 🚀 **How to Generate More Data**

### 1. Browse Products
- Visit product pages → Increases view counters
- Each view increments `views:{product_id}:{hour}`

### 2. Make Purchases
- Complete checkout → Increments purchase counters  
- Each purchase increments `purchases:{product_id}:{hour}`

### 3. Trigger Price Updates
- Wait for pricing engine (every 3 minutes)
- Updates product cache and demand metrics

## 📈 **Monitoring Redis Usage**

### Check Memory Usage
```redis
INFO memory
# Look for used_memory and used_memory_human
```

### Check Key Statistics
```redis
INFO keyspace
# Shows number of keys and memory per database
```

### Monitor Hit Rates
```redis
CONFIG GET stats
# Monitor cache hit/miss ratios
```

## 🔍 **Advanced Inspection**

### Find All View Data
```redis
# All view counters for current hour
KEYS views:*:14

# All view counters for product 1
KEYS views:1:*

# Monitor real-time views
MONITOR
# Look for INCR views:* commands
```

### Find All Purchase Data
```redis
# All purchase counters for current hour  
KEYS purchases:*:14

# All purchase history for product 1
KEYS purchases:1:*

# Monitor real-time purchases
MONITOR  
# Look for INCR purchases:* commands
```

### Debug Missing Data
```redis
# Check if keys exist
EXISTS views:1:14
EXISTS purchases:1:14
EXISTS products:{}

# Check TTL (expiration)
TTL views:1:14
TTL purchases:1:14
TTL products:{}
```

## 📋 **Quick Reference**

| What You Want | Command | Example |
|---------------|---------|---------|
| See all keys | `KEYS *` | All Redis data |
| Product views | `KEYS views:*` | View tracking data |
| Product purchases | `KEYS purchases:*` | Purchase tracking |
| Product cache | `KEYS products:*` | Cached product data |
| Demand metrics | `KEYS demand:*` | Demand calculations |
| Live monitoring | `MONITOR` | Real-time activity |
| Memory usage | `INFO memory` | Redis performance |
| Key details | `TYPE key` `TTL key` | Key metadata |

## Expected Results

When you inspect Redis, you should find:
- **View counters** for products you've browsed
- **Purchase counters** for completed orders  
- **Product cache** with current product data
- **Demand metrics** calculated from view/purchase ratios
- **Hourly data** that expires every 60 minutes

The reason you only see "purchase and views" is because **that's currently all your app stores in Redis**!
