const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const logger = require('../utils/logger');

function getDateWindow(timeframe) {
  switch (timeframe) {
    case '1d':
      return "CURRENT_DATE";
    case '30d':
      return "CURRENT_DATE - INTERVAL '30 days'";
    case '7d':
    default:
      return "CURRENT_DATE - INTERVAL '7 days'";
  }
}

// Get pricing analytics
router.get('/pricing', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '7d';
    const windowStart = getDateWindow(timeframe);

    const result = await query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS price_changes,
        COALESCE(AVG(ABS(new_price - old_price)), 0)::numeric(10,2) AS avg_price_change
      FROM pricing_history
      WHERE created_at >= ${windowStart}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching pricing analytics:', error);
    res.status(500).json({ error: 'Failed to fetch pricing analytics' });
  }
});

// Get orders analytics (optionally scoped by user id)
router.get('/orders', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '7d';
    const userId = parseInt(req.query.userId || '0', 10) || null;
    const windowStart = getDateWindow(timeframe);

    const params = [];
    let where = `o.created_at >= ${windowStart}`;
    if (userId) {
      params.push(userId);
      where += ` AND o.user_id = $${params.length}`;
    }

    const result = await query(`
      SELECT
        DATE(o.created_at) AS date,
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS total_revenue
      FROM orders o
      WHERE ${where}
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `, params);

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching orders analytics:', error);
    res.status(500).json({ error: 'Failed to fetch orders analytics' });
  }
});

// Get competitor prices
router.get('/competitor-prices', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        cp.competitor_name AS name,
        cp.price
      FROM competitor_prices cp
      JOIN products p ON p.id = cp.product_id
      WHERE p.is_active = true
      ORDER BY p.id, cp.price
    `);

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.product_id)) {
        grouped.set(row.product_id, {
          product_id: row.product_id,
          product_name: row.product_name,
          competitors: []
        });
      }
      grouped.get(row.product_id).competitors.push({
        name: row.name,
        price: Number(row.price)
      });
    }

    res.json(Array.from(grouped.values()));
  } catch (error) {
    logger.error('Error fetching competitor prices:', error);
    res.status(500).json({ error: 'Failed to fetch competitor prices' });
  }
});

// Get dashboard analytics (scoped by user purchases when userId is provided)
router.get('/dashboard', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId || '0', 10) || 1;
    const userParams = [userId];

    const activeProductsResult = await query(`
      SELECT
        COUNT(*)::int as total_products,
        COALESCE(AVG(current_price), 0)::numeric(12,2) as avg_price,
        COALESCE(SUM(stock_quantity), 0)::int as total_stock
      FROM products
      WHERE is_active = true
    `);

    const todayOrdersResult = await query(`
      SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total_amount), 0)::numeric(12,2) as total_revenue,
        COALESCE(AVG(total_amount), 0)::numeric(12,2) as avg_order_value
      FROM orders
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, userParams);

    const userOrderTotals = await query(`
      SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total_amount), 0)::numeric(12,2) as total_revenue,
        COALESCE(AVG(total_amount), 0)::numeric(12,2) as avg_order_value
      FROM orders
      WHERE user_id = $1
    `, userParams);

    const topProductsResult = await query(`
      SELECT
        p.id,
        p.name,
        COALESCE(MAX(p.image_url), '') AS image_url,
        SUM(oi.quantity)::int as orders,
        COALESCE(SUM(oi.total_price), 0)::numeric(12,2) as revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY p.id, p.name
      ORDER BY orders DESC
      LIMIT 10
    `, userParams);

    const recentOrdersResult = await query(`
      SELECT
        o.id,
        o.order_number,
        o.total_amount AS total,
        o.status,
        o.created_at,
        COUNT(oi.id)::int AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `, userParams);

    const totalRevenueTopProducts = topProductsResult.rows.reduce((sum, item) => sum + Number(item.revenue), 0);
    const productCostDistribution = topProductsResult.rows
      .filter(item => Number(item.revenue) > 0)
      .map(item => ({
        name: item.name,
        value: Number(item.revenue),
        percentage: totalRevenueTopProducts > 0 
          ? Number(((Number(item.revenue) / totalRevenueTopProducts) * 100).toFixed(1)) 
          : 0
      }));

    res.json({
      total_products: activeProductsResult.rows[0].total_products,
      total_orders: userOrderTotals.rows[0].total_orders,
      total_revenue: userOrderTotals.rows[0].total_revenue,
      avg_order_value: userOrderTotals.rows[0].avg_order_value,
      top_products: topProductsResult.rows,
      product_cost_distribution: productCostDistribution,
      recent_orders: recentOrdersResult.rows,
      active_products: activeProductsResult.rows[0],
      today_orders: todayOrdersResult.rows[0],
      today_metrics: {
        products_viewed: 0,
        total_views: 0,
        unique_viewers: 0
      },
      recent_price_changes: []
    });
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

module.exports = router;
