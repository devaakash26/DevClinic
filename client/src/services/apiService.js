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

// Create a custom fetch with retry logic
export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      console.log(`Fetching ${url} (Attempt ${retries + 1}/${maxRetries})`);
      const response = await fetch(url, options);
      
      // Handle 404 errors by retrying
      if (response.status === 404) {
        console.warn(`Received 404 for ${url}, retrying...`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`Fetch error (Attempt ${retries + 1}/${maxRetries}):`, error);
      lastError = error;
      retries++;
      
      if (retries < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
};

export default {
  API_BASE_URL,
  SERVER_URL,
  SOCKET_URL,
  getApiUrl,
  fetchWithRetry
}; 