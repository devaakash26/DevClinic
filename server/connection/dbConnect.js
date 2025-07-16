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

  // Optimized connection options for serverless
  const opts = {
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false,
    maxPoolSize: 1,
    minPoolSize: 0,
    autoIndex: false,
    retryWrites: true,
    // Using the correct keepAlive options for MongoDB
    heartbeatFrequencyMS: 30000,
    family: 4 // Use IPv4, skip IPv6
  };

  try {
    // Check if URI exists
    if (!process.env.URI) {
      console.error("MongoDB URI is missing");
      return null;
    }

    // Connect to MongoDB with timeout
    console.log("Connecting to MongoDB...");
    const connectPromise = mongoose.connect(process.env.URI, opts);
    
    // Add timeout to connection attempt
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Race between connection and timeout
    cachedConnection = await Promise.race([connectPromise, timeoutPromise]);
    console.log("MongoDB connected successfully");
    
    // Handle connection close on serverless instance shutdown
    const cleanup = async () => {
      if (cachedConnection) {
        console.log("Closing MongoDB connection due to shutdown");
        await mongoose.connection.close();
        cachedConnection = null;
      }
    };

    // Add cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    cachedConnection = null;
    return null;
  }
};

module.exports = dbConnect;