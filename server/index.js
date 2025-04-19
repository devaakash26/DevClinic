const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const serverless = require('serverless-http');
const corsOptions = require('./cors-config');
const dbConnect = require("./connection/dbConnect");

const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health Check Routes
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

// Register Routes with DB connection in middleware
app.use('/api/user', async (req, res, next) => {
  await dbConnect();
  next();
}, require('./routes/userRoutes'), require('./routes/userRoute'));

app.use('/api/admin', async (req, res, next) => {
  await dbConnect();
  next();
}, require('./routes/adminRoute'));

app.use('/api/doctor', async (req, res, next) => {
  await dbConnect();
  next();
}, require('./routes/doctorRoute'));

app.use('/api/support', async (req, res, next) => {
  await dbConnect();
  next();
}, require('./routes/supportRoute'));

// Catch-all route
app.use('*', (req, res) => {
  res.status(200).send(`Server is running. Path: ${req.originalUrl}`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Dev server (only runs locally)
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

// ✅ Export the serverless handler
module.exports = serverless(app);
