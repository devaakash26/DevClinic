const dotenv = require('dotenv');
dotenv.config();

// This file helps properly configure Google Calendar API credentials
// by cleaning up any potential formatting issues in the .env file

// Fix any potential issues with spaces in environment variables
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID_MEET ? process.env.GOOGLE_CLIENT_ID_MEET.trim() : null,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET_MEET ? process.env.GOOGLE_CLIENT_SECRET_MEET.trim() : null,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN_MEET ? process.env.GOOGLE_REFRESH_TOKEN_MEET.trim() : null,
  calendarId: process.env.GOOGLE_CALENDAR_ID_MEET ? process.env.GOOGLE_CALENDAR_ID_MEET.trim() : 'primary',
  redirectUri: process.env.GOOGLE_REDIRECT_URI ? process.env.GOOGLE_REDIRECT_URI.trim() : 'https://developers.google.com/oauthplayground'
};

// Check if we have all required credentials
const isConfigured = () => {
  const { clientId, clientSecret, refreshToken } = googleConfig;
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID_MEET is missing or empty in environment variables');
    return false;
  }
  
  if (!clientSecret) {
    console.error('GOOGLE_CLIENT_SECRET_MEET is missing or empty in environment variables');
    return false;
  }
  
  if (!refreshToken) {
    console.error('GOOGLE_REFRESH_TOKEN_MEET is missing or empty in environment variables');
    return false;
  }
  
  console.log('Google Calendar API credentials are properly configured');
  return true;
};

// Provide a cleaned up and validated configuration
module.exports = {
  googleConfig,
  isConfigured
}; 