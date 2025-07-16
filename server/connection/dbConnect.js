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
    connectTimeoutMS: 3000, // Reduced timeout
    socketTimeoutMS: 3000, // Reduced timeout
    serverSelectionTimeoutMS: 3000, // Reduced timeout
    bufferCommands: false,
    maxPoolSize: 1,
    minPoolSize: 0,
    autoIndex: false,
    retryWrites: true,
    family: 4
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
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });
    
    // Race between connection and timeout
    cachedConnection = await Promise.race([connectPromise, timeoutPromise]);
    console.log("MongoDB connected successfully");

    // Add connection error handler
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedConnection = null;
    });

    // Add disconnection handler
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedConnection = null;
    });
    
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    cachedConnection = null;
    return null;
  }
};

module.exports = dbConnect;