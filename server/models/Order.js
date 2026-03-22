const { query, getClient } = require('../config/database');
const { getCache, setCache, deleteCache, incrementCounter } = require('../config/redis');
const logger = require('../utils/logger');

class Order {
  static async create(orderData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (user_id, order_number, status, total_amount, shipping_address)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        orderData.user_id,
        orderNumber,
        'pending',
        orderData.total_amount,
        orderData.shipping_address
      ]);
      
      const order = orderResult.rows[0];
      
      // Create order items
      for (const item of orderData.items) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          order.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);
        
        // Update product stock
        await client.query(`
          UPDATE products 
          SET stock_quantity = stock_quantity - $1
          WHERE id = $2
        `, [item.quantity, item.product_id]);
        
        // Record purchase for demand scoring
        const purchaseKey = `purchases:${item.product_id}:${new Date().getHours()}`;
        await incrementCounter(purchaseKey, item.quantity);
      }
      
      await client.query('COMMIT');
      
      // Clear caches
      await deleteCache('orders:*');
      await deleteCache('products:*');
      
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async findById(id) {
    try {
      const cacheKey = `order:${id}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;
      
      const result = await query(`
        SELECT o.*, u.email, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `, [id]);
      
      if (result.rows.length === 0) return null;
      
      const order = result.rows[0];
      
      // Get order items
      const itemsResult = await query(`
        SELECT oi.*, p.name as product_name, p.image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [id]);
      
      order.items = itemsResult.rows;
      
      await setCache(cacheKey, order, 600); // 10 minutes cache
      return order;
    } catch (error) {
      logger.error('Error finding order by ID:', error);
      throw error;
    }
  }
  
  static async findByUserId(userId, filters = {}) {
    try {
      const cacheKey = `orders:user:${userId}:${JSON.stringify(filters)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;
      
      let sql = `
        SELECT o.*, 
          (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        WHERE o.user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;
      
      if (filters.status) {
        sql += ` AND o.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      
      sql += ` ORDER BY o.created_at DESC`;
      
      if (filters.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }
      
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }
      
      const result = await query(sql, params);
      
      await setCache(cacheKey, result.rows, 300); // 5 minutes cache
      return result.rows;
    } catch (error) {
      logger.error('Error finding orders by user ID:', error);
      throw error;
    }
  }
  
  static async updateStatus(id, status) {
    try {
      const result = await query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [status, id]);
      
      if (result.rows.length === 0) return null;
      
      await deleteCache(`order:${id}`);
      await deleteCache('orders:*');
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }
  
  static async getAnalytics(timeframe = '7d') {
    try {
      const cacheKey = `order-analytics:${timeframe}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;
      
      let timeCondition = '';
      switch (timeframe) {
        case '1d':
          timeCondition = "created_at >= CURRENT_DATE";
          break;
        case '7d':
          timeCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        default:
          timeCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
      }
      
      const result = await query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT user_id) as unique_customers,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
        FROM orders
        WHERE ${timeCondition}
      `);
      
      const analytics = result.rows[0];
      
      // Get top products
      const topProductsResult = await query(`
        SELECT 
          p.id,
          p.name,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.${timeCondition.replace('created_at', 'o.created_at')}
        GROUP BY p.id, p.name
        ORDER BY total_sold DESC
        LIMIT 10
      `);
      
      analytics.top_products = topProductsResult.rows;
      
      await setCache(cacheKey, analytics, 600); // 10 minutes cache
      return analytics;
    } catch (error) {
      logger.error('Error getting order analytics:', error);
      throw error;
    }
  }
}

module.exports = Order;
