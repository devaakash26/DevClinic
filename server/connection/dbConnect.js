const { default: mongoose } = require("mongoose")

// Global cached connection
let cachedConnection = null;

// Connect to MongoDB optimized for serverless
const dbConnect = async () => {
  // If we already have a connection, use it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Short connection timeout for serverless environment
  const opts = {
    connectTimeoutMS: 15000,
    socketTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000
  };

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    cachedConnection = await mongoose.connect(process.env.URI, opts);
    console.log("MongoDB connected successfully");
    return cachedConnection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    // Don't throw error in serverless to prevent function failure
    // Return mongoose anyway so app can still run with potential lazy connection
    return mongoose;
  }
};

module.exports = dbConnect;