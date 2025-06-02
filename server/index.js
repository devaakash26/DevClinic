const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const serverless = require('serverless-http');
const corsOptions = require('./cors-config');
const dbConnect = require("./connection/dbConnect");

// Initialize MongoDB connection early but don't wait for it to complete
let dbPromise = dbConnect().catch(err => {
  console.error("Initial DB connection failed:", err);
  // Don't throw, let the server start anyway
});

const app = express();

// CORS handling - explicit preflight handling
app.options('*', cors(corsOptions));

// Apply minimal middleware for better performance
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Root route handler - NO DB CONNECTION REQUIRED
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Developer Clinic API Server',
    timestamp: new Date().toISOString()
  });
});

// Simple health check endpoint - NO DB CONNECTION REQUIRED
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API is working!',
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

app.get('/api/auth-test', (req, res) => {
  const authHeader = req.headers.authorization;
  res.status(200).json({
    authHeader: authHeader ? 'Present' : 'Missing',
    authType: authHeader ? authHeader.split(' ')[0] : 'None',
    message: 'Auth header debug information'
  });
});

app.all('/api/request-debug', (req, res) => {
  res.status(200).json({
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    params: req.params,
    timestamp: new Date().toISOString()
  });
});

// Middleware to ensure MongoDB is connected per request
const withDb = (handler) => [
  async (req, res, next) => {
    try {
      // Use the pre-initialized connection promise
      await dbPromise;
      next();
    } catch (err) {
      console.error("DB Connection Error:", err);
      res.status(500).json({ 
        error: "Database connection failed",
        message: err.message 
      });
    }
  },
  handler
];

// Register Routes - These require DB connection
app.use('/api/user', ...withDb(require('./routes/userRoutes')));
app.use('/api/user', ...withDb(require('./routes/userRoute')));
app.use('/api/admin', ...withDb(require('./routes/adminRoute')));
app.use('/api/doctor', ...withDb(require('./routes/doctorRoute')));
app.use('/api/support', ...withDb(require('./routes/supportRoute')));
app.use('/api/payment', ...withDb(require('./routes/paymentRoutes')));

// Catch-all route for API paths - Should return 404 for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint not found: ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for non-API paths
app.use('*', (req, res) => {
  // Exclude API paths which are handled above
  if (!req.originalUrl.startsWith('/api/')) {
    res.status(200).json({
      message: 'Developer Clinic API Server',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error occurred',
    path: req.originalUrl
  });
});

// Local Dev Mode
if (process.env.NODE_ENV !== 'production') {
  const http = require("http");
  const { Server } = require("socket.io");
  const PORT = process.env.PORT || 4000;

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  server.listen(PORT, () => {
    console.log(`🚀 Dev server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel - ensure compatibility with their serverless functions
module.exports = (req, res) => {
  // This let's us use serverless-http while also being compatible with Vercel's function format
  return app(req, res);
}; 