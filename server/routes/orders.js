const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Get orders by user (auth required)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    // Only allow users to view their own orders.
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filters = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
    };

    const orders = await Order.findByUserId(userId, filters);
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Create new order (auth required, persists into DB)
router.post('/', auth, async (req, res) => {
  try {
    const { items = [], total_amount, shipping_address } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unit_price ?? item.price ?? 0);

      return {
        product_id: Number(item.product_id ?? item.id),
        quantity,
        unit_price: unitPrice,
        total_price: Number((unitPrice * quantity).toFixed(2))
      };
    }).filter((item) => item.product_id && item.quantity > 0 && item.unit_price >= 0);

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'Order items are invalid' });
    }

    const computedTotal = Number(
      normalizedItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)
    );

    const order = await Order.create({
      user_id: req.user.id,
      items: normalizedItems,
      total_amount: Number(total_amount) || computedTotal,
      shipping_address: shipping_address || null
    });

    const fullOrder = await Order.findById(order.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('new-order', {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount
      });
    }

    logger.info(`Order created: ${order.order_number}`);
    res.status(201).json(fullOrder || order);
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order by ID (auth required)
router.get('/:id', auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (auth required; only owner can update in this demo)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];

    if (!orderId || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status update' });
    }

    const order = await Order.updateStatus(orderId, status);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('order-status-update', {
        orderId: order.id,
        status: order.status
      });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
