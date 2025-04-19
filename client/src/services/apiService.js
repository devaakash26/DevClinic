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

// Socket URL with explicit configuration to avoid path issues
export const SOCKET_URL = SERVER_URL;

// Debug URLs
console.log("API Base URL:", API_BASE_URL);
console.log("Server URL:", SERVER_URL);
console.log("Socket URL:", SOCKET_URL);

export default {
  API_BASE_URL,
  SERVER_URL,
  SOCKET_URL,
  getApiUrl
}; 