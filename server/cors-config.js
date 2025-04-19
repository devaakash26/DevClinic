// CORS configuration for production and development environments
const ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:5173",
  // Production client origins
  "https://developer-clinic.vercel.app",
  "https://developer-clinic-61fwr79z2-devaakash26s-projects.vercel.app"
  // Add any other client domains here
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS: ", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions; 