const { query } = require('../config/database');
const Product = require('../models/Product');
const logger = require('../utils/logger');

class PricingEngine {
  constructor() {
    this.demandThreshold = parseFloat(process.env.DEMAND_THRESHOLD) || 100;
    this.minPriceChange = parseFloat(process.env.MIN_PRICE_CHANGE) || 0.03;
    this.maxPriceChange = parseFloat(process.env.MAX_PRICE_CHANGE) || 0.05;
  }

  async updateAllPrices(io) {
    try {
      logger.info('Starting price update for all products');
      
      // Get all active products
      const productsResult = await query(`
        SELECT * FROM products WHERE is_active = true
      `);
      
      const products = productsResult.rows;
      const updates = [];
      
      for (const product of products) {
        try {
          const update = await this.updateProductPrice(product, io);
          if (update) {
            updates.push(update);
          }
        } catch (error) {
          logger.error(`Error updating price for product ${product.id}:`, error);
        }
      }
      
      logger.info(`Price update completed. Updated ${updates.length} products`);
      return updates;
    } catch (error) {
      logger.error('Error in pricing engine:', error);
      throw error;
    }
  }

  async updateProductPrice(product, io) {
    try {
      // Get demand metrics
      const metrics = await Product.getDemandMetrics(product.id);
      
      // Get competitor prices
      const competitorResult = await query(`
        SELECT AVG(price) as avg_price, MIN(price) as min_price, MAX(price) as max_price
        FROM competitor_prices
        WHERE product_id = $1
      `, [product.id]);
      
      const competitorPrices = competitorResult.rows[0];
      
      // Calculate demand score
      const demandScore = this.calculateDemandScore(
        metrics.demand_score,
        competitorPrices.avg_price,
        product.current_price
      );
      
      // Determine new price
      const newPrice = this.calculateNewPrice(
        product,
        demandScore,
        competitorPrices.avg_price
      );
      
      // Lower threshold for testing - always update if there's any change
      const minChange = 0.005; // 0.5% minimum change for testing
      
      // If price changed, update and record
      if (Math.abs(newPrice - product.current_price) > minChange) {
        const oldPrice = product.current_price;
        
        // Update product price
        await Product.update(product.id, { current_price: newPrice });
        
        // Record price change
        const reason = this.getPriceChangeReason(demandScore, metrics, competitorPrices);
        await Product.recordPriceChange(
          product.id,
          oldPrice,
          newPrice,
          demandScore,
          reason
        );
        
        // Notify clients via WebSocket
        if (io) {
          io.to(`product-${product.id}`).emit('price-update', {
            productId: product.id,
            productName: product.name,
            oldPrice: oldPrice,
            newPrice: newPrice,
            demandScore: demandScore,
            reason: reason
          });
          
          io.emit('global-price-update', {
            productId: product.id,
            productName: product.name,
            newPrice: newPrice
          });
        }
        
        logger.info(`Price updated for product ${product.id}: ${oldPrice} -> ${newPrice} (${reason})`);
        
        return {
          productId: product.id,
          productName: product.name,
          oldPrice: oldPrice,
          newPrice: newPrice,
          demandScore: demandScore,
          reason: reason
        };
      }
      
      logger.debug(`No price change needed for product ${product.id} (change: ${Math.abs(newPrice - product.current_price)} < ${minChange})`);
      return null;
    } catch (error) {
      logger.error(`Error updating price for product ${product.id}:`, error);
      return null;
    }
  }

  calculateDemandScore(baseDemandScore, avgCompetitorPrice, currentPrice) {
    let demandScore = baseDemandScore || 0;
    
    // Factor in competitor pricing
    if (avgCompetitorPrice) {
      const priceDifference = (currentPrice - avgCompetitorPrice) / avgCompetitorPrice;
      
      // If we're significantly cheaper, increase demand score
      if (priceDifference < -0.1) {
        demandScore *= 1.2;
      }
      // If we're significantly more expensive, decrease demand score
      else if (priceDifference > 0.1) {
        demandScore *= 0.8;
      }
    }
    
    return demandScore;
  }

  calculateNewPrice(product, demandScore, avgCompetitorPrice) {
    let newPrice = product.current_price;
    let priceChangePercent = 0;
    
    // More aggressive pricing for testing
    const minChange = 0.01; // 1% minimum change
    const maxChange = 0.05; // 5% maximum change
    
    // Always make some change for testing
    if (demandScore > 0) {
      // High demand - increase price
      if (demandScore > 50) {
        priceChangePercent = Math.min(maxChange, minChange + Math.random() * 0.03);
        newPrice = product.current_price * (1 + priceChangePercent);
      }
      // Medium demand - random change
      else if (demandScore > 10) {
        priceChangePercent = (Math.random() - 0.5) * 0.04; // ±2%
        newPrice = product.current_price * (1 + priceChangePercent);
      }
      // Low demand - decrease price
      else {
        priceChangePercent = -minChange - Math.random() * 0.02; // -1% to -3%
        newPrice = product.current_price * (1 + priceChangePercent);
      }
    } else {
      // No demand data - make small random change
      priceChangePercent = (Math.random() - 0.5) * 0.02; // ±1%
      newPrice = product.current_price * (1 + priceChangePercent);
    }
    
    // Consider competitor prices
    if (avgCompetitorPrice) {
      const competitorFactor = 0.3; // How much weight to give competitor prices
      const targetPrice = avgCompetitorPrice * (1 + (Math.random() - 0.5) * 0.1); // Slight variation around competitor price
      newPrice = newPrice * (1 - competitorFactor) + targetPrice * competitorFactor;
    }
    
    // Enforce min/max price bounds (if they exist)
    const minPrice = product.min_price || product.current_price * 0.5;
    const maxPrice = product.max_price || product.current_price * 2;
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
    
    // Round to 2 decimal places
    return Math.round(newPrice * 100) / 100;
  }

  getPriceChangeReason(demandScore, metrics, competitorPrices) {
    const reasons = [];
    
    if (demandScore > this.demandThreshold) {
      reasons.push('High demand');
    } else if (demandScore < this.demandThreshold / 2) {
      reasons.push('Low demand');
    }
    
    if (metrics.views_last_hour > 50) {
      reasons.push('High view volume');
    }
    
    if (metrics.purchase_rate > 0.1) {
      reasons.push('High purchase rate');
    } else if (metrics.purchase_rate < 0.02) {
      reasons.push('Low purchase rate');
    }
    
    if (competitorPrices.avg_price) {
      reasons.push('Competitor pricing');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Automated pricing adjustment';
  }

  async generateMockCompetitorPrices() {
    try {
      // Get all products without competitor prices
      const productsResult = await query(`
        SELECT p.* FROM products p
        LEFT JOIN competitor_prices cp ON p.id = cp.product_id
        WHERE p.is_active = true AND cp.product_id IS NULL
        LIMIT 10
      `);
      
      const competitors = ['TechStore', 'ElectroHub', 'SmartGear', 'FitWorld', 'SportsPlus'];
      
      for (const product of productsResult.rows) {
        // Generate 2-3 competitor prices per product
        const numCompetitors = Math.floor(Math.random() * 2) + 2;
        
        for (let i = 0; i < numCompetitors; i++) {
          const competitorName = competitors[Math.floor(Math.random() * competitors.length)];
          
          // Generate price within +/- 20% of current price
          const variance = (Math.random() - 0.5) * 0.4; // -20% to +20%
          const competitorPrice = product.current_price * (1 + variance);
          
          await query(`
            INSERT INTO competitor_prices (product_id, competitor_name, price, url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [
            product.id,
            competitorName,
            Math.round(competitorPrice * 100) / 100,
            `https://example.com/${competitorName.toLowerCase()}/${product.id}`
          ]);
        }
      }
      
      logger.info(`Generated mock competitor prices for ${productsResult.rows.length} products`);
    } catch (error) {
      logger.error('Error generating mock competitor prices:', error);
    }
  }

  async updateCompetitorPrices() {
    try {
      // Simulate competitor price updates
      const result = await query(`
        SELECT * FROM competitor_prices
        ORDER BY RANDOM()
        LIMIT 20
      `);
      
      for (const competitorPrice of result.rows) {
        // Random price change between -5% and +5%
        const changePercent = (Math.random() - 0.5) * 0.1;
        const newPrice = competitorPrice.price * (1 + changePercent);
        
        await query(`
          UPDATE competitor_prices
          SET price = $1, last_checked = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [Math.round(newPrice * 100) / 100, competitorPrice.id]);
      }
      
      logger.info(`Updated ${result.rows.length} competitor prices`);
    } catch (error) {
      logger.error('Error updating competitor prices:', error);
    }
  }
}

module.exports = new PricingEngine();
