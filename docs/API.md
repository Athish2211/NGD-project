# API Documentation

This document describes the REST API endpoints for the Dynamic Pricing E-Commerce platform.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "data": {...},
  "message": "Success"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": {...}
}
```

## Endpoints

### Authentication

#### Register User
```http
POST /users/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "token": "jwt-token-here"
}
```

#### Login User
```http
POST /users/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "token": "jwt-token-here"
}
```

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### Update Profile
```http
PUT /users/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith"
}
```

#### Change Password
```http
PUT /users/password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

### Products

#### Get All Products
```http
GET /products
```

**Query Parameters:**
- `category_id` (optional): Filter by category ID
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter
- `search` (optional): Search term for name/description
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip

**Response:**
```json
[
  {
    "id": 1,
    "name": "Wireless Headphones",
    "description": "High-quality wireless headphones",
    "category_id": 1,
    "category_name": "Electronics",
    "base_price": 99.99,
    "current_price": 104.99,
    "min_price": 79.99,
    "max_price": 149.99,
    "stock_quantity": 50,
    "sku": "WH-001",
    "image_url": "https://example.com/image.jpg",
    "avg_competitor_price": 102.50,
    "is_active": true,
    "created_at": "2023-01-01T00:00:00Z"
  }
]
```

#### Get Product by ID
```http
GET /products/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "category_id": 1,
  "category_name": "Electronics",
  "base_price": 99.99,
  "current_price": 104.99,
  "min_price": 79.99,
  "max_price": 149.99,
  "stock_quantity": 50,
  "sku": "WH-001",
  "image_url": "https://example.com/image.jpg",
  "avg_competitor_price": 102.50,
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### Get Product Demand Metrics
```http
GET /products/:id/demand
```

**Response:**
```json
{
  "views_last_hour": 25,
  "purchases_last_hour": 3,
  "purchase_rate": 0.12,
  "demand_score": 3.0
}
```

#### Get Product Pricing History
```http
GET /products/:id/pricing-history
```

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 10)

**Response:**
```json
[
  {
    "id": 1,
    "product_id": 1,
    "old_price": 99.99,
    "new_price": 104.99,
    "demand_score": 3.0,
    "reason": "High demand, competitor pricing",
    "created_at": "2023-01-01T12:00:00Z"
  }
]
```

#### Create Product (Admin)
```http
POST /products
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "category_id": 1,
  "base_price": 99.99,
  "current_price": 99.99,
  "min_price": 79.99,
  "max_price": 149.99,
  "stock_quantity": 50,
  "sku": "NP-001",
  "image_url": "https://example.com/image.jpg"
}
```

#### Update Product (Admin)
```http
PUT /products/:id
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "current_price": 109.99,
  "stock_quantity": 45
}
```

### Orders

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 104.99,
      "total_price": 209.98
    }
  ],
  "shipping_address": "123 Main St, City, State 12345"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "order_number": "ORD-1234567890-123",
  "status": "pending",
  "total_amount": 209.98,
  "shipping_address": "123 Main St, City, State 12345",
  "created_at": "2023-01-01T12:00:00Z"
}
```

#### Get Order by ID
```http
GET /orders/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "order_number": "ORD-1234567890-123",
  "status": "pending",
  "total_amount": 209.98,
  "shipping_address": "123 Main St, City, State 12345",
  "created_at": "2023-01-01T12:00:00Z",
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 2,
      "unit_price": 104.99,
      "total_price": 209.98,
      "product_name": "Wireless Headphones",
      "image_url": "https://example.com/image.jpg"
    }
  ]
}
```

#### Get User Orders
```http
GET /orders/user/:userId
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by order status
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip

**Response:**
```json
[
  {
    "id": 1,
    "order_number": "ORD-1234567890-123",
    "status": "pending",
    "total_amount": 209.98,
    "item_count": 2,
    "created_at": "2023-01-01T12:00:00Z"
  }
]
```

#### Update Order Status (Admin)
```http
PATCH /orders/:id/status
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "processing"
}
```

### Analytics

#### Get Pricing Analytics
```http
GET /analytics/pricing
```

**Query Parameters:**
- `timeframe` (optional): `1d`, `7d`, `30d` (default: `7d`)

**Response:**
```json
{
  "pricing_changes": [
    {
      "date": "2023-01-01",
      "price_changes": 15,
      "avg_price_change": 2.50
    }
  ],
  "pricing_distribution": [
    {
      "category": "Electronics",
      "product_count": 10,
      "avg_price": 125.99,
      "price_change_percentage": 5.2
    }
  ],
  "top_price_changes": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "price_change_percentage": 8.5,
      "total_price_changes": 5
    }
  ]
}
```

#### Get Order Analytics
```http
GET /analytics/orders
```

**Query Parameters:**
- `timeframe` (optional): `1d`, `7d`, `30d` (default: `7d`)

**Response:**
```json
{
  "total_orders": 150,
  "total_revenue": 15499.50,
  "avg_order_value": 103.33,
  "unique_customers": 85,
  "completed_orders": 120,
  "pending_orders": 25,
  "cancelled_orders": 5,
  "top_products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "total_sold": 45,
      "total_revenue": 4724.55
    }
  ]
}
```

#### Get Competitor Price Analytics
```http
GET /analytics/competitor-prices
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Wireless Headphones",
    "current_price": 104.99,
    "avg_competitor_price": 102.50,
    "competitor_count": 3,
    "min_competitor_price": 99.99,
    "max_competitor_price": 109.99,
    "price_difference_percentage": 2.4
  }
]
```

#### Get Dashboard Metrics
```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "today_metrics": {
    "products_viewed": 25,
    "total_views": 150,
    "unique_viewers": 45
  },
  "today_orders": {
    "total_orders": 8,
    "total_revenue": 825.50,
    "avg_order_value": 103.19
  },
  "active_products": {
    "total_products": 25,
    "avg_price": 87.50,
    "total_stock": 1250
  },
  "recent_price_changes": [
    {
      "id": 1,
      "product_name": "Wireless Headphones",
      "old_price": 99.99,
      "new_price": 104.99,
      "reason": "High demand"
    }
  ]
}
```

## WebSocket Events

### Connection

Connect to WebSocket server:
```javascript
const socket = io('http://localhost:5000');
```

### Events

#### Price Update
```javascript
socket.on('price-update', (data) => {
  console.log('Price updated:', data);
  // data: { productId, productName, oldPrice, newPrice, demandScore, reason }
});
```

#### Global Price Update
```javascript
socket.on('global-price-update', (data) => {
  console.log('Global price update:', data);
  // data: { productId, productName, newPrice }
});
```

#### New Order
```javascript
socket.on('new-order', (data) => {
  console.log('New order:', data);
  // data: { orderId, orderNumber, totalAmount }
});
```

#### Order Status Update
```javascript
socket.on('order-status-update', (data) => {
  console.log('Order status updated:', data);
  // data: { orderId, status }
});
```

### Join Product Room

To receive updates for a specific product:
```javascript
socket.emit('join-product-room', productId);
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per 15 minutes per IP
- Exceeded limits return HTTP 429 status

## Pagination

List endpoints support pagination:
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

Example:
```
GET /products?limit=10&offset=20
```

## Sorting

List endpoints support sorting via query parameters:
- `sort`: Field to sort by
- `order`: `asc` or `desc` (default: `asc`)

Example:
```
GET /products?sort=price&order=desc
```

## Filtering

Most list endpoints support filtering:
- Use query parameters to filter results
- Multiple filters can be combined
- Filter values should match the expected data type

Example:
```
GET /products?category_id=1&min_price=50&max_price=200
```
