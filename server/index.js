const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Avoid heavyweight modules at the top level
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const serverless = require('serverless-http');
const corsOptions = require('./cors-config');

// Create express app
const app = express();

// Apply CORS middleware before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Apply remaining middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Global middleware to ensure CORS headers are set on all responses
app.use((req, res, next) => {
  // Add CORS headers to all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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
    timestamp: new Date().toISOString()
  });
});

// Simple health check endpoint - NO DB CONNECTION REQUIRED
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
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
      // Connect to database on demand
      const connection = await dbConnect();
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
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store online users
  const onlineUsers = new Map();

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store the socket instance for reference in Express routes
    app.set('io', io);
    
    // User authenticated and connected
    socket.on('user_connected', (userData) => {
      console.log('User connected:', userData.userId);
      
      // Add user to online users
      onlineUsers.set(userData.userId, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
        isDoctor: userData.isDoctor,
        isAdmin: userData.isAdmin
      });
      
      // Broadcast updated online users list
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
    
    // Join a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });
    
    // Send a message
    socket.on('send_message', async (messageData) => {
      console.log('New message:', messageData);
      
      // Emit to the specific chat room
      io.to(messageData.chatId).emit('receive_message', messageData);
      
      // Emit to the specific receiver if they're not in the chat room
      const receiver = onlineUsers.get(messageData.receiverId);
      if (receiver) {
        socket.to(receiver.socketId).emit('new_message_notification', {
          message: messageData.message,
          sender: messageData.sender,
          chatId: messageData.chatId
        });
      }
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Find and remove the disconnected user
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      
      // Broadcast updated online users list
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Dev server running on http://localhost:${PORT}`);
  });
} else {
  // Production mode - use Vercel's serverless WebSocket support
  const { Server } = require("socket.io");
  
  // Create a Socket.IO server that works with serverless
  const io = new Server({
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    addTrailingSlash: false
  });

  // Store online users (use a more persistent store in production)
  const onlineUsers = new Map();

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store the socket instance for reference
    app.set('io', io);
    
    // User authenticated and connected
    socket.on('user_connected', (userData) => {
      console.log('User connected:', userData.userId);
      
      onlineUsers.set(userData.userId, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
        isDoctor: userData.isDoctor,
        isAdmin: userData.isAdmin
      });
      
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
    
    // Join a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });
    
    // Send a message
    socket.on('send_message', async (messageData) => {
      console.log('New message:', messageData);
      
      io.to(messageData.chatId).emit('receive_message', messageData);
      
      const receiver = onlineUsers.get(messageData.receiverId);
      if (receiver) {
        socket.to(receiver.socketId).emit('new_message_notification', {
          message: messageData.message,
          sender: messageData.sender,
          chatId: messageData.chatId
        });
      }
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      
      io.emit('online_users', Array.from(onlineUsers.values()));
    });
  });

  // Attach Socket.IO to the serverless function
  app.io = io;
}

// ✅ Export the serverless handler for Vercel
module.exports = serverless(app, { provider: 'aws' }); 