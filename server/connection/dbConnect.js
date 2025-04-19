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
            serverSelectionTimeoutMS: 30000,
            ssl: true,
            sslValidate: true,
            retryWrites: true,
            w: "majority"
        };

        console.log("Connecting to database...");
        cached.promise = mongoose.connect(process.env.URI, opts)
            .then(mongoose => {
                console.log("Database Successfully Connected");
                return mongoose;
            })
            .catch(error => {
                console.error("Database Connection Error:", error);
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