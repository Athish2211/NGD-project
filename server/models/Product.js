const { query } = require('../config/database');
const { getCache, setCache, deleteCache, incrementCounter } = require('../config/redis');
const logger = require('../utils/logger');

class Product {
  static async findAll(filters = {}) {
    try {
      const cacheKey = `products:${JSON.stringify(filters)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      let sql = `
        SELECT p.*, c.name as category_name,
        COALESCE(cp.avg_competitor_price, 0) as avg_competitor_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN (
          SELECT product_id, AVG(price) as avg_competitor_price
          FROM competitor_prices
          GROUP BY product_id
        ) cp ON p.id = cp.product_id
        WHERE p.is_active = true
      `;
      
      const params = [];
      let paramIndex = 1;

      if (filters.category_id) {
        sql += ` AND p.category_id = $${paramIndex}`;
        params.push(filters.category_id);
        paramIndex++;
      }

      if (filters.min_price) {
        sql += ` AND p.current_price >= $${paramIndex}`;
        params.push(filters.min_price);
        paramIndex++;
      }

      if (filters.max_price) {
        sql += ` AND p.current_price <= $${paramIndex}`;
        params.push(filters.max_price);
        paramIndex++;
      }

      if (filters.search) {
        sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY p.created_at DESC`;

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
      logger.error('Error finding products:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const cacheKey = `product:${id}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const result = await query(`
        SELECT p.*, c.name as category_name,
        COALESCE(cp.avg_competitor_price, 0) as avg_competitor_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN (
          SELECT product_id, AVG(price) as avg_competitor_price
          FROM competitor_prices
          GROUP BY product_id
        ) cp ON p.id = cp.product_id
        WHERE p.id = $1 AND p.is_active = true
      `, [id]);

      if (result.rows.length === 0) return null;
      
      const product = result.rows[0];
      await setCache(cacheKey, product, 600); // 10 minutes cache
      return product;
    } catch (error) {
      logger.error('Error finding product by ID:', error);
      throw error;
    }
  }

  static async create(productData) {
    try {
      const result = await query(`
        INSERT INTO products (name, description, category_id, base_price, current_price, 
        min_price, max_price, stock_quantity, sku, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        productData.name,
        productData.description,
        productData.category_id,
        productData.base_price,
        productData.current_price,
        productData.min_price,
        productData.max_price,
        productData.stock_quantity,
        productData.sku,
        productData.image_url
      ]);

      await deleteCache('products:*'); // Clear product list cache
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);

      const result = await query(`
        UPDATE products 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      if (result.rows.length === 0) return null;

      await deleteCache(`product:${id}`);
      await deleteCache('products:*');
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  static async recordView(productId, userId = null, ipAddress = null, userAgent = null) {
    try {
      await query(`
        INSERT INTO product_views (product_id, user_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [productId, userId, ipAddress, userAgent]);

      // Increment view counter in Redis for demand scoring
      const hourKey = `views:${productId}:${new Date().getHours()}`;
      await incrementCounter(hourKey);
      
      logger.debug(`Recorded view for product ${productId}`);
    } catch (error) {
      logger.error('Error recording product view:', error);
    }
  }

  static async getDemandMetrics(productId) {
    try {
      const cacheKey = `demand:${productId}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      // Get views in the last hour
      const currentHour = new Date().getHours();
      const viewKey = `views:${productId}:${currentHour}`;
      const viewsLastHour = await incrementCounter(viewKey, 0);

      // Get purchases in the last hour
      const purchaseKey = `purchases:${productId}:${currentHour}`;
      const purchasesLastHour = await incrementCounter(purchaseKey, 0);

      // Calculate purchase rate
      const purchaseRate = viewsLastHour > 0 ? purchasesLastHour / viewsLastHour : 0;

      // Get demand score
      const demandScore = viewsLastHour * purchaseRate;

      const metrics = {
        views_last_hour: viewsLastHour,
        purchases_last_hour: purchasesLastHour,
        purchase_rate: purchaseRate,
        demand_score: demandScore
      };

      await setCache(cacheKey, metrics, 300); // 5 minutes cache
      return metrics;
    } catch (error) {
      logger.error('Error getting demand metrics:', error);
      return {
        views_last_hour: 0,
        purchases_last_hour: 0,
        purchase_rate: 0,
        demand_score: 0
      };
    }
  }

  static async getPricingHistory(productId, limit = 10) {
    try {
      const result = await query(`
        SELECT * FROM pricing_history 
        WHERE product_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [productId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting pricing history:', error);
      throw error;
    }
  }

  static async recordPriceChange(productId, oldPrice, newPrice, demandScore, reason) {
    try {
      await query(`
        INSERT INTO pricing_history (product_id, old_price, new_price, demand_score, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [productId, oldPrice, newPrice, demandScore, reason]);

      await deleteCache(`product:${productId}`);
      await deleteCache('products:*');
    } catch (error) {
      logger.error('Error recording price change:', error);
      throw error;
    }
  }
}

module.exports = Product;
