require('dotenv').config();
const express = require('express');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple test route
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Debug server working!', 
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Debug server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Test endpoints:`);
  console.log(`   http://localhost:${PORT}/test`);
  console.log(`   http://localhost:${PORT}/health`);
  
  // Test the server itself
  setTimeout(() => {
    console.log('🔍 Testing server from within...');
    http.get(`http://localhost:${PORT}/test`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Internal test successful:', JSON.parse(data).message);
      });
    }).on('error', (err) => {
      console.error('❌ Internal test failed:', err.message);
    });
  }, 1000);
});
