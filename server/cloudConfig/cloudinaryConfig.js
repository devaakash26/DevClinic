const cloudinary = require('cloudinary').v2;
const https = require('https');

// Configure cloudinary with self-signed certificate handling
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Set HTTPS agent to ignore certificate validation if needed
// This helps with self-signed certificate issues
if (process.env.NODE_ENV !== 'production') {
  cloudinary.config({
    https_agent: new https.Agent({
      rejectUnauthorized: false
    })
  });
}

module.exports = cloudinary;
