const { default: mongoose } = require("mongoose")

// Hold cached connection
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const dbConnect = async () => {
    // If already connected, return the existing connection
    if (cached.conn) {
        console.log("Using existing database connection");
        return cached.conn;
    }

    // If connection is in progress, wait for it
    if (!cached.promise) {
        const opts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 30000
        };

        // MongoDB connection with retry logic
        const connectWithRetry = async (retries = 5, interval = 5000) => {
            try {
                console.log(`Connecting to MongoDB... (Attempt ${6 - retries})`);
                return await mongoose.connect(process.env.URI, opts);
            } catch (error) {
                console.error("MongoDB Connection Error:", error.message);
                
                if (retries <= 1) {
                    console.error("Maximum connection attempts reached. Giving up.");
                    throw error;
                }
                
                console.log(`Retrying in ${interval/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, interval));
                return connectWithRetry(retries - 1, interval);
            }
        };

        cached.promise = connectWithRetry()
            .then(mongoose => {
                console.log("Database Successfully Connected");
                return mongoose;
            })
            .catch(error => {
                console.error("Database Connection Failed:", error.message);
                cached.promise = null;
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
        throw error;
    }
}

module.exports = dbConnect;