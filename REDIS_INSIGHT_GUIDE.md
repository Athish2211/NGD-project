# Redis Insight Guide - Check What's Stored

## Prerequisites
- Redis server running (localhost:6379)
- Redis Insight installed (comes with Redis Desktop Manager)
- Your application should be connected to Redis

## Step-by-Step Guide

### 1. Start Redis (if not running)
```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis container
docker run -d --name redis -p 6379:6379 redis:latest

# Or if using your existing setup
docker start redis
```

### 2. Open Redis Insight

#### Method 1: Redis Desktop Manager
1. **Download Redis Desktop Manager**
   - Go to: https://redisdesktop.com/
   - Download and install for Windows

2. **Connect to Redis**
   - Open Redis Desktop Manager
   - Click **"Connect to Redis Server"**
   - **Name**: `Dynamic Pricing Redis`
   - **Host**: `localhost`
   - **Port**: `6379`
   - **Password**: Leave empty (no password set)
   - Click **"Connect"**

#### Method 2: Redis CLI
1. **Open Command Prompt**
2. **Connect to Redis**:
   ```bash
   redis-cli -h localhost -p 6379
   ```

#### Method 3: Redis Insight (built-in)
1. **If using Redis with Insight** (Redis 6.0+)
2. **Access via web interface**: http://localhost:8001 (if configured)

### 3. What to Look For

#### Application Keys
Your dynamic pricing app stores these types of data:

##### 1. Pricing Cache
- **Key Pattern**: `product:*` or `pricing:*`
- **Example Keys**:
  - `product:1:price`
  - `product:2:price`
  - `pricing:cache:product_1`

##### 2. Session Data
- **Key Pattern**: `session:*` or `auth:*`
- **Example Keys**:
  - `session:user_123`
  - `auth:token_abc123`

##### 3. Real-time Updates
- **Key Pattern**: `realtime:*` or `updates:*`
- **Example Keys**:
  - `realtime:price_updates`
  - `updates:product_changes`

##### 4. Demand Metrics
- **Key Pattern**: `demand:*` or `metrics:*`
- **Example Keys**:
  - `demand:product_1:views`
  - `metrics:daily_sales`

### 4. Redis Commands to Inspect Data

#### View All Keys
```redis
# List all keys
KEYS *

# List keys with pattern
KEYS product:*
KEYS session:*
KEYS pricing:*

# Count total keys
DBSIZE
```

#### Examine Specific Keys
```redis
# Get value of a key
GET product:1:price

# Get multiple keys
MGET product:1:price product:2:price

# Get key info (type, TTL, etc.)
TYPE product:1:price
TTL product:1:price
```

#### Monitor Real-time Data
```redis
# Subscribe to real-time updates
SUBSCRIBE price_updates
SUBSCRIBE product_changes

# Monitor Redis operations (in another terminal)
MONITOR
```

### 5. Expected Data Structure

#### Product Pricing Cache
```
Key: product:1:price
Type: String
Value: "99.99"
TTL: 300 (5 minutes)

Key: product:1:history
Type: List
Value: ["95.99", "97.50", "99.99"]
TTL: 3600 (1 hour)
```

#### User Session Data
```
Key: session:user_123
Type: Hash
Fields:
  - user_id: "123"
  - email: "user@example.com"
  - last_activity: "2026-03-23T10:30:00Z"
TTL: 1800 (30 minutes)
```

#### Real-time Updates
```
Key: realtime:price_updates
Type: Pub/Sub Channel
Messages:
  - Product 1 price updated to $99.99
  - Product 2 price updated to $149.99
```

### 6. Common Redis Patterns Used

#### Cache Keys
```
# Product cache
product:{id}:price
product:{id}:details
product:{id}:demand

# User cache
user:{id}:profile
user:{id}:preferences
session:{session_id}

# Analytics cache
analytics:daily:{date}
metrics:hourly:{hour}
trends:product_views
```

#### Expiration (TTL)
```
# Product pricing: 5 minutes (300 seconds)
# User sessions: 30 minutes (1800 seconds)
# Analytics data: 1 hour (3600 seconds)
# Historical data: 24 hours (86400 seconds)
```

### 7. Troubleshooting

#### No Connection
**Problem**: "Could not connect to Redis"

**Solutions**:
- Check if Redis is running: `docker ps | grep redis`
- Verify port: `docker port redis` (should show 6379)
- Check firewall settings
- Try connecting via CLI: `redis-cli ping`

#### No Data Visible
**Problem**: Redis connects but shows no keys

**Solutions**:
- Check if application is running and connected
- Verify application is using Redis (check server logs)
- Try different key patterns: `KEYS *`, `KEYS *:*`
- Check application's Redis configuration

#### Data Not Updating
**Problem**: Redis data is stale

**Solutions**:
- Check TTL of keys: `TTL product:1:price`
- Monitor real-time channels: `SUBSCRIBE price_updates`
- Check application logs for Redis errors
- Verify pricing engine is running

### 8. Advanced Redis Operations

#### Batch Operations
```redis
# Get multiple product prices
MGET product:1:price product:2:price product:3:price

# Set multiple values
MSET product:1:price "99.99" product:2:price "149.99"

# Atomic operations
MULTI
SET product:1:price "99.99"
INCR product:1:view_count
EXEC
```

#### Analytics and Monitoring
```redis
# Get Redis info
INFO memory
INFO stats
INFO clients

# Monitor slow queries
SLOWLOG GET 10

# Check memory usage
MEMORY USAGE product:1:price
MEMORY STATS
```

### 9. Integration with Your Application

#### How App Uses Redis
1. **Product Pricing**: Cache current prices for fast access
2. **Session Management**: Store user session data
3. **Real-time Updates**: Publish price changes via pub/sub
4. **Analytics Caching**: Store computed metrics
5. **Demand Tracking**: Monitor product view counts

#### Expected Redis Usage
- **Memory Usage**: 10-50MB (depending on traffic)
- **Keys**: 100-1000 active keys
- **Operations**: 1000+ ops/sec during peak usage
- **Connections**: 1-5 (application instances)

### 10. Quick Reference Commands

```redis
# Basic inspection
KEYS *                    # List all keys
DBSIZE                    # Total key count
INFO memory               # Memory usage
INFO stats                # General statistics

# Data operations
GET key                   # Get value
SET key value              # Set value
DEL key                   # Delete key
EXPIRE key seconds        # Set expiration

# Pattern matching
KEYS pattern*             # Find keys by pattern
SCAN 0 MATCH pattern*    # Safer alternative

# Monitoring
MONITOR                   # Watch all commands
SUBSCRIBE channel          # Listen for updates
PUBLISH channel message     # Send update
```

## Next Steps

Once connected to Redis Insight:
1. **Browse Keys**: Use `KEYS *` to see all stored data
2. **Examine Values**: Check product prices, sessions, analytics
3. **Monitor Activity**: Use `MONITOR` to see real-time operations
4. **Check Performance**: Use `INFO` commands for system stats
5. **Debug Issues**: Look for expired keys or connection problems

You'll be able to see exactly what your dynamic pricing application is storing in Redis!
