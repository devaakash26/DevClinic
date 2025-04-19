const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const serverless = require('serverless-http');
const corsOptions = require('./cors-config');

// Lazy-load expensive modules only when needed
let authUser, userFeedbackRoutes, adminRoute, doctorRoute, supportRoute;
let dbConnect, mongoose;

// Apply lightweight middleware first
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check - super fast endpoint that doesn't touch DB
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Quick test route - doesn't use DB
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    message: 'API is working!', 
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Auth test - no DB needed
app.get('/api/auth-test', (req, res) => {
  const authHeader = req.headers.authorization;
  res.status(200).json({
    authHeader: authHeader ? 'Present' : 'Missing',
    authType: authHeader ? authHeader.split(' ')[0] : 'None',
    message: 'Auth header debug information'
  });
});

// Debug route
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

// Lazy-initialize database connection and routes when needed
const initDbAndRoutes = async () => {
  // Only load these modules when actually needed
  if (!dbConnect) {
    dbConnect = require("./connection/dbConnect");
    mongoose = require("mongoose");
    authUser = require("./routes/userRoutes");
    userFeedbackRoutes = require("./routes/userRoute");
    adminRoute = require("./routes/adminRoute");
    doctorRoute = require("./routes/doctorRoute");
    supportRoute = require("./routes/supportRoute");
    
    // Configure API routes
    app.use('/api/user', authUser);
    app.use('/api/user', userFeedbackRoutes);
    app.use('/api/admin', adminRoute);
    app.use('/api/doctor', doctorRoute);
    app.use('/api/support', supportRoute);
    
    // Initialize database connection
    try {
      await dbConnect();
    } catch (err) {
      console.error('Database connection error but continuing:', err.message);
    }
  }
};

// Middleware to ensure DB is connected before handling DB routes
app.use('/api/user', async (req, res, next) => {
  await initDbAndRoutes();
  next();
});

app.use('/api/admin', async (req, res, next) => {
  await initDbAndRoutes();
  next();
});

app.use('/api/doctor', async (req, res, next) => {
  await initDbAndRoutes();
  next();
});

app.use('/api/support', async (req, res, next) => {
  await initDbAndRoutes();
  next();
});

// Catch-all route
app.use('*', (req, res) => {
  // If it's an API route that we haven't handled yet, initialize DB
  if (req.originalUrl.startsWith('/api/') && 
      !req.originalUrl.startsWith('/api/health') && 
      !req.originalUrl.startsWith('/api/test') && 
      !req.originalUrl.startsWith('/api/auth-test') && 
      !req.originalUrl.startsWith('/api/request-debug')) {
    
    initDbAndRoutes().then(() => {
      res.status(200).json({
        message: 'API endpoint served by catch-all',
        path: req.originalUrl
      });
    }).catch(err => {
      res.status(500).json({
        error: 'Failed to initialize database',
        message: err.message
      });
    });
    return;
  }
  
  // For other routes
  res.status(200).send(`Server is running. Path: ${req.originalUrl}`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const http = require("http");
  const { Server } = require("socket.io");
  const PORT = process.env.PORT || 4000;
  
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`Local server running on port ${PORT}`);
    
    // Initialize DB for local development
    initDbAndRoutes().catch(err => {
      console.error('Local DB initialization error:', err);
    });
  });
}

// Export serverless handler
module.exports = serverless(app);





