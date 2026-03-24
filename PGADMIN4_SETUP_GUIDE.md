# pgAdmin4 Setup Guide for Dynamic Pricing E-commerce Database

## Prerequisites
- PostgreSQL installed and running
- pgAdmin4 installed
- Your database container should be running

## Database Connection Information

### Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database Name**: dynamic_pricing_ecommerce
- **Username**: postgres
- **Password**: password

## Step-by-Step Setup

### 1. Start PostgreSQL (if not running)
```bash
# Using Docker (recommended)
docker start postgres-db

# Or if PostgreSQL is installed locally
# Make sure PostgreSQL service is running
```

### 2. Open pgAdmin4
- Launch pgAdmin4 from your applications or start menu
- Or access via web browser: http://localhost:5050 (if installed via Docker)

### 3. Create Server Connection

#### Method 1: Quick Setup
1. Click **"Add New Server"** (or the plug icon ⚡)
2. **General Tab**:
   - Name: `Dynamic Pricing E-commerce`
3. **Connection Tab**:
   - Host name/address: `localhost`
   - Port: `5432`
   - Maintenance database: `dynamic_pricing_ecommerce`
   - Username: `postgres`
   - Password: `password`
4. Click **"Save"**

#### Method 2: Advanced Setup
1. Right-click **"Servers"** in the left panel
2. Select **"Create"** → **"Server..."**
3. Fill in the same details as above

### 4. Verify Connection
- You should see `Dynamic Pricing E-commerce` under Servers
- Expand it to see:
  - Databases
  - Login Roles
  - Tablespaces

### 5. Explore the Database

#### View Tables
1. Expand **"Databases"**
2. Expand **"dynamic_pricing_ecommerce"**
3. Expand **"Schemas"**
4. Expand **"public"**
5. Click **"Tables"**

#### Expected Tables
- `products` - Product information
- `users` - User accounts
- `orders` - Order data
- `categories` - Product categories
- `pricing_history` - Price change history
- `demand_metrics` - Demand tracking data

#### View Table Data
1. Right-click on any table
2. Select **"View/Edit Data"** → **"All Rows"**
3. Browse the data in the main panel

### 6. Run SQL Queries

#### Using Query Tool
1. Right-click on the database
2. Select **"Query Tool"**
3. Write and execute SQL queries

#### Sample Queries
```sql
-- View all products
SELECT * FROM products;

-- View recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- View pricing history
SELECT * FROM pricing_history ORDER BY updated_at DESC LIMIT 20;

-- Check database schema
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### 7. Database Diagram (ERD)

#### Create Visual Diagram
1. Right-click on the database
2. Select **"ERD"** → **"Create ERD"**
3. Select tables to include
4. Generate and save the diagram

## Troubleshooting

### Common Issues

#### 1. Connection Failed
**Problem**: "Connection to server at "localhost" (5432) failed"

**Solutions**:
- Make sure PostgreSQL is running: `docker ps | grep postgres`
- Check port: `docker ps` should show port mapping
- Verify container name: `docker start postgres-db`

#### 2. Authentication Failed
**Problem**: "password authentication failed for user "postgres""

**Solutions**:
- Verify password is exactly "password"
- Check username is "postgres"
- Ensure using correct database name

#### 3. Database Doesn't Exist
**Problem**: "database "dynamic_pricing_ecommerce" does not exist"

**Solutions**:
- Run database setup: `.\START_WITH_DB.bat`
- Or manually create database:
```sql
CREATE DATABASE dynamic_pricing_ecommerce;
```

#### 4. No Tables Visible
**Problem**: Database connects but no tables appear

**Solutions**:
- Run database seeding: `npm run seed` (in server directory)
- Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

### Docker-Specific Issues

#### Check Container Status
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View container logs
docker logs postgres-db

# Restart container if needed
docker restart postgres-db
```

#### Port Mapping Issues
```bash
# Check port mapping
docker port postgres-db

# Should show: 5432/tcp -> 0.0.0.0:5432
```

## Advanced Features

### 1. Backup Database
1. Right-click database → **"Backup..."**
2. Choose backup format and location
3. Set backup options

### 2. Import/Export Data
- **Import**: Right-click table → **"Import/Export"**
- **Export**: Right-click table → **"Export"**

### 3. Performance Monitoring
1. Dashboard → **"Dashboards"**
2. View database performance metrics
3. Monitor query performance

### 4. User Management
1. **Login/Group Roles** → Create new users
2. Set permissions for different users
3. Manage database access

## Quick Reference

### Connection String
```
Host: localhost
Port: 5432
Database: dynamic_pricing_ecommerce
Username: postgres
Password: password
```

### Key Tables
- `products` - Product catalog
- `users` - User accounts
- `orders` - Order management
- `pricing_history` - Price tracking
- `demand_metrics` - Analytics data

### Useful Queries
```sql
-- Product count
SELECT COUNT(*) FROM products;

-- Recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- Price changes today
SELECT * FROM pricing_history 
WHERE DATE(updated_at) = CURRENT_DATE;
```

## Next Steps

Once connected, you can:
- Browse and edit data directly
- Run SQL queries for analysis
- Create custom reports
- Monitor database performance
- Export data for backup

Your pgAdmin4 is now ready to explore the dynamic pricing e-commerce database!
