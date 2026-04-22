# Setup Guide

This guide will help you set up the Dynamic Pricing E-Commerce platform on your local machine.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- npm or yarn

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dynamic-pricing-ecommerce
```

### 2. Install Dependencies

```bash
npm run install-deps
```

This will install dependencies for both the backend and frontend.

### 3. Database Setup

#### PostgreSQL

1. Create a database:
```sql
CREATE DATABASE dynamic_pricing_ecommerce;
```

2. Update the database URL in `server/.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/dynamic_pricing_ecommerce
```

#### Redis

Make sure Redis is running on the default port (6379). Update the Redis URL in `server/.env` if needed:
```
REDIS_URL=redis://localhost:6379
```

### 4. Environment Configuration

#### Backend Environment (`server/.env`)

```env
DATABASE_URL=postgresql://username:password@localhost:5432/dynamic_pricing_ecommerce
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=5000
PRICING_UPDATE_INTERVAL=300000
DEMAND_THRESHOLD=100
MIN_PRICE_CHANGE=0.03
MAX_PRICE_CHANGE=0.05
```

#### Frontend Environment (root `.env`)

```env
REACT_APP_API_URL=http://localhost:5000
```

### 5. Database Initialization

```bash
npm run setup-db
```

This will:
- Create all database tables
- Insert sample data
- Create demo user account

### 6. Start the Application

```bash
npm run dev
```

This will start both the backend and frontend servers concurrently.

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## Demo Account

Login with these credentials to test the application:

- **Email**: demo@example.com
- **Password**: demo123

## Features Overview

### Dynamic Pricing Engine

The pricing engine runs automatically every 5 minutes and:

- Calculates demand scores based on views and purchases
- Compares with competitor prices
- Adjusts prices according to predefined rules
- Records all price changes with reasons

### Real-time Features

- Live price updates via WebSocket
- Real-time order notifications
- Demand metrics tracking
- Competitor price monitoring

### Analytics Dashboard

- Pricing trends and history
- Order analytics
- Competitor price comparison
- Demand metrics visualization

## Development

### Backend Development

```bash
cd server
npm run dev
```

### Frontend Development

```bash
cd client
npm start
```

### Database Operations

```bash
# Reset database
cd server
npm run setup-db

# Seed additional data
npm run seed
```

## Architecture

### Backend (Node.js + Express)

- RESTful API with JWT authentication
- PostgreSQL for persistent data
- Redis for caching and real-time data
- Socket.IO for WebSocket connections
- Cron jobs for automated pricing

### Frontend (React)

- Modern React with hooks
- Tailwind CSS for styling
- Recharts for data visualization
- Socket.IO client for real-time updates
- Context API for state management

### Pricing Algorithm

The system uses a sophisticated pricing algorithm:

1. **Demand Score Calculation**: `views_per_hour × purchase_rate × competitor_factor`
2. **Price Adjustment Rules**:
   - High demand (> threshold): +5% price increase
   - Low demand (< threshold/2): -3% price decrease
   - Competitor price consideration: 30% weight
3. **Bounds Enforcement**: Prices stay within min/max limits

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database URL in `.env`
   - Ensure database exists

2. **Redis Connection Error**
   - Verify Redis is running
   - Check Redis URL in `.env`
   - Test with `redis-cli ping`

3. **Port Conflicts**
   - Change PORT in `server/.env`
   - Update REACT_APP_API_URL accordingly

4. **CORS Errors**
   - Ensure REACT_APP_API_URL matches backend URL
   - Check CORS configuration in server

### Logs

- Backend logs: `server/logs/`
- Check console for frontend errors
- Use browser dev tools for WebSocket debugging

## Production Deployment

### Environment Variables

```env
NODE_ENV=production
JWT_SECRET=strong-random-string
DATABASE_URL=production-database-url
REDIS_URL=production-redis-url
```

### Security Considerations

- Use strong JWT secrets
- Enable HTTPS
- Configure firewall rules
- Regular database backups
- Monitor for suspicious activity

## API Documentation

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Key Endpoints

- `GET /api/products` - List products with filtering
- `GET /api/products/:id` - Get product details
- `POST /api/orders` - Create new order
- `GET /api/analytics/pricing` - Pricing analytics
- `GET /api/analytics/dashboard` - Dashboard metrics

### WebSocket Events

- `price-update` - Product price changed
- `new-order` - New order received
- `order-status-update` - Order status changed

## Support

For issues and questions:

1. Check this documentation
2. Review error logs
3. Test with demo account
4. Verify environment configuration

## License

MIT License - see LICENSE file for details.
