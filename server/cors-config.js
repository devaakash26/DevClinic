// CORS configuration for production and development environments
const ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:5173",
  // Production client origins
  "https://developer-clinic.vercel.app",
  "https://developer-clinic-61fwr79z2-devaakash26s-projects.vercel.app",
  "https://developer-clinic-eusid2a20-devaakash26s-projects.vercel.app",
  // Allow all Vercel preview deployments
  /https:\/\/developer-clinic.*\.vercel\.app$/
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
  methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 