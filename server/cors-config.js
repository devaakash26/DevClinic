const ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:5173",
  "http://localhost:4000",
  // Production client origins
  "https://developer-clinic.vercel.app",
  "https://developer-clinic-devaakash26s-projects.vercel.app",
  "https://developer-clinic-git-main-devaakash26s-projects.vercel.app",
  "https://devclinic-1.onrender.com",
  // Server origin
  "https://developer-clinic-server.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all Vercel preview deployments
    if (origin.match(/https:\/\/developer-clinic.*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Check against explicit allowed origins
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS: ", origin);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
  preflightContinue: false
};

module.exports = corsOptions;
