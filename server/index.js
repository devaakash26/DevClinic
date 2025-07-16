const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Avoid heavyweight modules at the top level
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const corsOptions = require('./cors-config');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Create express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
});

// Apply CORS middleware before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Apply remaining middleware with optimized settings
app.use(express.json({ limit: '1mb' })); // Reduced limit
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Reduced limit
app.use(bodyParser.json({ limit: '1mb' })); // Reduced limit
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' })); // Reduced limit

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Global middleware to ensure CORS headers and handle timeouts
app.use((req, res, next) => {
  // Add CORS headers to all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Set response timeout
  res.setTimeout(8000, () => {
    console.error('Request timeout');
    res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Request took too long to process'
    });
  });
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Root route handler - NO DB CONNECTION REQUIRED
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Developer Clinic API Server',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Simple health check endpoint - NO DB CONNECTION REQUIRED
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Lazy-load database connection - moved inside the middleware
const withDb = (handler) => [
  async (req, res, next) => {
    try {
      // Skip DB connection for OPTIONS requests
      if (req.method === 'OPTIONS') {
        return next();
      }

      // Import DB connect here to avoid initial cold start penalty
      const dbConnect = require("./connection/dbConnect");
      
      // Set a timeout for the database connection
      const timeout = setTimeout(() => {
        res.status(504).json({
          error: 'Database Connection Timeout',
          message: 'Database connection took too long'
        });
      }, 5000);

      // Connect to database on demand
      const connection = await dbConnect();
      clearTimeout(timeout);

      if (!connection) {
        return res.status(503).json({
          error: "Database connection failed",
          message: "Could not establish database connection",
          timestamp: new Date().toISOString()
        });
      }
      next();
    } catch (err) {
      console.error("DB Connection Error:", err);
      res.status(503).json({
        error: "Database connection failed",
        message: err.message,
        timestamp: new Date().toISOString()
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
app.use('/api/chat', ...withDb(require('./routes/chatRoutes')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Socket.io setup
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 