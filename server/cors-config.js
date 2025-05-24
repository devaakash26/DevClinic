// CORS configuration for production and development environments
const ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:5173",
  // Production client origins
  "https://developer-clinic.vercel.app",
  "https://developer-clinic-devaakash26s-projects.vercel.app",
  "https://developer-clinic-git-main-devaakash26s-projects.vercel.app",
  // Allow all Vercel preview deployments
  /https:\/\/developer-clinic.*\.vercel\.app$/,
  // Server origins (to allow server-to-server communication)
  "https://developer-clinic-server.vercel.app"
  // Add any other client domains here
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact matches
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    
    // Check regex patterns (for Vercel preview URLs)
    const isPreviewUrl = ALLOWED_ORIGINS.some(allowedOrigin => {
      return allowedOrigin instanceof RegExp && allowedOrigin.test(origin);
    });
    
    if (isPreviewUrl) {
      callback(null, true);
      return;
    }
    
    // If we get here, origin is not allowed
    console.log("Blocked by CORS: ", origin);
    callback(new Error("Not allowed by CORS"));
  },
  methods: "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS",
  allowedHeaders: "X-Requested-With, Content-Type, Accept, Authorization",
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
  preflightContinue: false
};

module.exports = corsOptions; 