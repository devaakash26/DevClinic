const { default: mongoose } = require("mongoose")

// Global cached connection
let cachedConnection = null;

// Connect to MongoDB optimized for serverless
const dbConnect = async () => {
  // If we already have a connection, use it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log("Reusing existing MongoDB connection");
    return cachedConnection;
  }

  // Shorter connection timeout for serverless environment
  const opts = {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
    bufferCommands: true,
    maxPoolSize: 5,
    minPoolSize: 1
  };

  try {
    // Check if URI exists
    if (!process.env.URI) {
      console.error("MongoDB URI is missing");
      return null;
    }

    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    cachedConnection = await mongoose.connect(process.env.URI, opts);
    console.log("MongoDB connected successfully");
    
    // Handle connection close on serverless instance shutdown
    const cleanup = () => {
      if (cachedConnection) {
        console.log("Closing MongoDB connection due to shutdown");
        mongoose.connection.close();
      }
    };

    // Add cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    // Don't throw error in serverless to prevent function failure
    return null;
  }
};

module.exports = dbConnect;