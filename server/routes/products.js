const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const logger = require('../utils/logger');

// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };
    
    const products = await Product.findAll(filters);
    res.json(products);
  } catch (error) {
    logger.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Record product view
    await Product.recordView(
      req.params.id,
      req.user?.id || null,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json(product);
  } catch (error) {
    logger.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Get product demand metrics
router.get('/:id/demand', async (req, res) => {
  try {
    const metrics = await Product.getDemandMetrics(req.params.id);
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting demand metrics:', error);
    res.status(500).json({ error: 'Failed to get demand metrics' });
  }
});

// Get product pricing history
router.get('/:id/pricing-history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const history = await Product.getPricingHistory(req.params.id, limit);
    res.json(history);
  } catch (error) {
    logger.error('Error getting pricing history:', error);
    res.status(500).json({ error: 'Failed to get pricing history' });
  }
});

// Create new product (admin only)
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.update(req.params.id, req.body);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Notify clients about price change if price was updated
    if (req.body.current_price) {
      const io = req.app.get('io');
      io.to(`product-${req.params.id}`).emit('price-update', {
        productId: req.params.id,
        newPrice: req.body.current_price
      });
    }
    
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

module.exports = router;
