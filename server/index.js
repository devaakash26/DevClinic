const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const DbConnect = require("./connection/dbConnect");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const authUser = require("./routes/userRoutes");
const userFeedbackRoutes = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");
const doctorRoute = require("./routes/doctorRoute");
const supportRoute = require("./routes/supportRoute");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const serverless = require('serverless-http');

const cors = require("cors");
const corsOptions = require('./cors-config');
const PORT = process.env.PORT || 4000;

// Apply middleware before any route definitions
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure routes
app.use('/api/user', authUser);
app.use('/api/user', userFeedbackRoutes);
app.use('/api/admin', adminRoute);
app.use('/api/doctor', doctorRoute);
app.use('/api/support', supportRoute);

// Quick test route for serverless
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    message: 'API is working!', 
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Debug route to test authentication
app.get('/api/auth-test', (req, res) => {
  const authHeader = req.headers.authorization;
  res.status(200).json({
    authHeader: authHeader ? 'Present' : 'Missing',
    authType: authHeader ? authHeader.split(' ')[0] : 'None',
    message: 'Auth header debug information'
  });
});

// Debug route to check the request
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

// Catch-all route for unhandled routes to prevent 404s
app.use('*', (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.originalUrl}`);
  
  // Check if it's a Socket.IO request
  if (req.originalUrl.startsWith('/socket.io/')) {
    return res.status(200).send('Socket.IO endpoint');
  }
  
  // Return JSON for API routes
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(200).json({ 
      message: 'API endpoint caught by catch-all handler',
      path: req.originalUrl,
      method: req.method
    });
  }
  
  // Default response for other routes
  res.status(200).send(`
    <html>
      <head><title>Server Running</title></head>
      <body>
        <h1>Server is running</h1>
        <p>The requested path "${req.originalUrl}" was handled by the catch-all route.</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const server = http.createServer(app);
  
  // Socket.IO setup for local development
  const io = new Server(server);
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
  });
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Initialize MongoDB connection
DbConnect().catch(err => console.error('Database connection failed:', err));

// Export the serverless handler for Vercel
module.exports = serverless(app);





