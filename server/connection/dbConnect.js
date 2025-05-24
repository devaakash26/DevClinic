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

  // Short connection timeout for serverless environment
  const opts = {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    bufferCommands: true,
    maxPoolSize: 10,
    minPoolSize: 5
  };

  try {
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
    // Return mongoose anyway so app can still run with potential lazy connection
    return mongoose;
  }
};

module.exports = dbConnect;