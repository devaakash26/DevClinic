// API service for centralizing API calls and URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Helper function to get the full API URL
export const getApiUrl = (endpoint) => {
  // If the endpoint already starts with http, return it as is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // If the endpoint starts with /api, append it to the SERVER_URL
  if (endpoint.startsWith('/api')) {
    return `${SERVER_URL}${endpoint}`;
  }
  
  // Otherwise, consider it a relative path to API_BASE_URL
  return `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
};

// Socket URL - don't include the path as it's specified in the Socket.IO options
export const SOCKET_URL = SERVER_URL;

export default {
  API_BASE_URL,
  SERVER_URL,
  SOCKET_URL,
  getApiUrl
}; 