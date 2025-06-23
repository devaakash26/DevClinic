const ALLOWED_ORIGINS = [
  // Development origins
  "http://localhost:5173",
  "http://localhost:4000",
  // Production client origins
  "https://developer-clinic.vercel.app",
  "https://developer-clinic-devaakash26s-projects.vercel.app",
  "https://developer-clinic-git-main-devaakash26s-projects.vercel.app",
  "https://devclinic-1.onrender.com",
  // Allow all Vercel preview deployments
  // /https:\/\/developer-clinic.*\.vercel\.app$/,
  // Server origin
  "https://developer-clinic-server.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow curl/postman/etc

    const isAllowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS: ", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS",
  allowedHeaders: "X-Requested-With, Content-Type, Accept, Authorization",
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
  preflightContinue: false
};

module.exports = corsOptions;
