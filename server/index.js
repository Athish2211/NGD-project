require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');

const { connectDB } = require('./config/database');
// const { connectDB } = require('./config/database-temp');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const pricingEngine = require('./services/pricingEngine');

// Import routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders-fixed');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics-fixed');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.REACT_APP_API_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-product-room', (productId) => {
    socket.join(`product-${productId}`);
    logger.info(`Client ${socket.id} joined room for product ${productId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();
    
    // Start pricing engine cron job (every 15 seconds)
    cron.schedule('*/15 * * * * *', async () => {
      logger.info('Running pricing engine...');
      try {
        await pricingEngine.updateAllPrices(io);
        logger.info('Pricing engine completed successfully');
      } catch (error) {
        logger.error('Pricing engine error:', error);
      }
    });
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Server should be accessible at http://localhost:${PORT}`);
      
      // Test the server immediately
      setTimeout(() => {
        const http = require('http');
        http.get(`http://localhost:${PORT}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            logger.info('✅ Self-test successful:', data);
          });
        }).on('error', (err) => {
          logger.error('❌ Self-test failed:', err.message);
        });
      }, 2000);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io };
