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

const cors = require("cors");
const corsOptions = require('./cors-config');
const PORT = process.env.PORT || 4000;

// Apply middleware before any route definitions
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Create HTTP server
const server = http.createServer(app);

// Connect to database before setting up routes
(async () => {
  try {
    console.log("Attempting to connect to database...");
    await DbConnect();
    console.log("Database connection established successfully");
    
    // Set up API routes
    app.use('/api/user', authUser);
    app.use('/api/user', userFeedbackRoutes);
    app.use('/api/admin', adminRoute);
    app.use('/api/doctor', doctorRoute);
    app.use('/api/support', supportRoute);
    
    // Add server health endpoint for Socket.IO
    app.get('/socket.io', (req, res) => {
      res.status(200).send('Socket.IO endpoint is ready.');
    });

    // Test route to confirm middleware is working
    app.post('/api/test-body-parser', (req, res) => {
      console.log('Received body:', req.body);
      res.status(200).json({ 
        receivedBody: req.body,
        bodyParserWorking: !!req.body 
      });
    });

    // Respond to Socket.IO handshake requests
    app.options('/socket.io/*', (req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.sendStatus(200);
    });
    
    // Initialize Socket.io with Vercel-compatible settings
    const io = new Server(server, {
      cors: corsOptions,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      path: '/socket.io/',
      pingTimeout: 60000,
      pingInterval: 25000,
      cookie: false,
      serveClient: false,
      connectTimeout: 45000,
      perMessageDeflate: false,
      httpCompression: false,
      allowUpgrades: true,
      destroyUpgrade: false
    });

    // Store active users
    const activeUsers = new Map();

    // Store pending notifications
    const pendingNotifications = new Map();

    // Socket.io connection handling
    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);
      
      // User joins with their user ID
      socket.on("user_connected", (userId) => {
        if (userId) {
          console.log(`User ${userId} connected with socket ID ${socket.id}`);
          activeUsers.set(userId, socket.id);
          // Let the client know connection was successful
          socket.emit("connection_success", { userId });
          
          // Notify about active connection
          io.emit("user_status_change", { userId, status: "online" });

          // Deliver pending notifications
          const userNotifications = pendingNotifications.get(userId);
          if (userNotifications) {
            try {
              console.log(`Delivering pending notification to user ${userId}`);
              io.to(socket.id).emit("receive_notification", { 
                userId, 
                notification: userNotifications.notification 
              });
              pendingNotifications.delete(userId);
              console.log(`Delivered pending notification to user ${userId} with socket ${socket.id}`);
            } catch (error) {
              console.error(`Error delivering pending notification to user ${userId}:`, error);
            }
          }
        }
      });
      
      // Handle sending notifications
      socket.on("send_notification", (data) => {
        console.log("Notification request received:", data);
        
        const { userId, notification } = data;
        
        if (!userId || !notification) {
          console.error("Invalid notification data - missing userId or notification content");
          return;
        }
        
        // Ensure notification has required fields
        if (!notification._id) {
          notification._id = new Date().getTime().toString();
          console.log("Added missing _id to notification:", notification._id);
        }
        
        // Ensure notification has createdAt timestamp
        if (!notification.createdAt) {
          notification.createdAt = new Date();
          console.log("Added missing createdAt to notification");
        }
        
        // If recipient is active, send directly to them
        if (activeUsers.has(userId)) {
          const recipientSocketId = activeUsers.get(userId);
          io.to(recipientSocketId).emit("receive_notification", { 
            userId, 
            notification 
          });
          console.log(`Direct notification sent to user ${userId} with socket ${recipientSocketId}`);
        } else {
          // Log that user is not connected
          console.log(`User ${userId} is not connected. Current active users:`, Array.from(activeUsers.keys()));
          
          // Store notification for delivery when user connects
          // Instead of broadcasting to everyone
          pendingNotifications.set(userId, {
            notification,
            timestamp: new Date()
          });
          console.log(`Saved notification for user ${userId} to deliver when they connect`);
        }
      });
      
      // Handle notifications seen
      socket.on("notifications_seen", ({ userId }) => {
        if (userId && activeUsers.has(userId)) {
          socket.broadcast.emit("notification_read_update", { userId });
        }
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
      
      socket.on("disconnect", () => {
        // Remove user from active users
        for (const [userId, socketId] of activeUsers.entries()) {
          if (socketId === socket.id) {
            activeUsers.delete(userId);
            console.log(`User ${userId} disconnected`);
            
            // Notify about disconnection
            io.emit("user_status_change", { userId, status: "offline" });
            break;
          }
        }
        console.log("User disconnected:", socket.id);
      });
    });

    // Debug log for active connections every 5 minutes
    setInterval(() => {
      console.log(`Active users: ${activeUsers.size}`);
      console.log("Active user IDs:", Array.from(activeUsers.keys()));
    }, 300000);

    // Make io accessible to routes
    app.set('io', io);

    // Debug endpoint to check socket connections
    app.get('/api/debug/socket-status', (req, res) => {
      const activeUsersList = Array.from(activeUsers.entries()).map(([userId, socketId]) => ({
        userId,
        socketId,
        isConnected: true
      }));
      
      // Get pending notifications count
      const pendingNotificationsList = Array.from(pendingNotifications.entries()).map(([userId, data]) => ({
        userId,
        notificationCount: 1,
        timestamp: data.timestamp
      }));
      
      res.status(200).json({
        activeSocketsCount: activeUsers.size,
        activeUsers: activeUsersList,
        pendingNotifications: pendingNotificationsList,
        socketServerRunning: true,
        dbConnected: mongoose.connection.readyState === 1
      });
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      // Check MongoDB connection state
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      const mongoStatus = mongoose.connection.readyState;
      const mongoStatusText = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting',
      }[mongoStatus] || 'Unknown';
      
      // Get connected MongoDB database name if available
      const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'Not connected';
      
      res.status(200).json({ 
        status: 'OK',
        message: 'Server is healthy',
        database: {
          status: mongoStatus,
          statusText: mongoStatusText,
          database: dbName,
          url: process.env.URI ? process.env.URI.split('@')[1].split('/')[0] : 'N/A', // Safe portion of the connection string
        },
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // Socket.IO test route
    app.get('/api/socket-test', (req, res) => {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Socket.IO Test</title>
          <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', () => {
              const output = document.getElementById('output');
              const serverUrl = '${process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:4000'}';
              
              log('Attempting to connect to: ' + serverUrl);
              
              const socket = io(serverUrl, {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                secure: true,
                rejectUnauthorized: false,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000
              });
              
              socket.on('connect', () => {
                log('Connected to Socket.IO server. Socket ID: ' + socket.id);
              });
              
              socket.on('connect_error', (err) => {
                log('Connection Error: ' + err.message);
                console.error('Error details:', err);
              });
              
              socket.on('disconnect', (reason) => {
                log('Disconnected: ' + reason);
              });
              
              function log(message) {
                const item = document.createElement('li');
                item.textContent = message;
                output.appendChild(item);
                console.log(message);
              }
            });
          </script>
        </head>
        <body>
          <h1>Socket.IO Connection Test</h1>
          <p>Server Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>This page tests the Socket.IO connection to the server.</p>
          <ul id="output"></ul>
        </body>
        </html>
      `);
    });

    // Use server.listen instead of app.listen
    server.listen(PORT, () => {
      console.log(`Server is running at ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    console.error('MongoDB connection details:', {
      uri: process.env.URI ? process.env.URI.substring(0, 20) + '...[REDACTED]' : 'Not defined',
      nodeEnv: process.env.NODE_ENV,
      // Log any other relevant info without exposing credentials
    });
    process.exit(1); // Exit with error
  }
})();





