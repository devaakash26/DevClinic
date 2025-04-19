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

app.use(cors(corsOptions));

// Connect to database before setting up routes
(async () => {
  try {
    await DbConnect();
    
    // Set up routes and middleware after DB connection
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use('/api/user', authUser);
    app.use('/api/user', userFeedbackRoutes);
    app.use('/api/admin', adminRoute);
    app.use('/api/doctor', doctorRoute);
    app.use('/api/support', supportRoute);

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    
    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new Server(server, {
      cors: corsOptions
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
      res.status(200).json({ 
        status: 'OK',
        message: 'Server is healthy',
        dbConnected: mongoose.connection.readyState === 1
      });
    });

    // Use server.listen instead of app.listen
    server.listen(PORT, () => {
      console.log(`Server is running at ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1); // Exit with error
  }
})();





