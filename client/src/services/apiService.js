// API service for centralizing API calls and URL configuration
const API_BASE_URL = import.meta.env.API_URL || 'http://localhost:4000/api';
const SERVER_URL = import.meta.env.SERVER_URL || 'http://localhost:4000';

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

// Create a custom fetch with retry logic and timeout
export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let retries = 0;
  let lastError;

  // Default timeout of 30 seconds
  const timeout = options.timeout || 30000;
  
  while (retries < maxRetries) {
    try {
      console.log(`Fetching ${url} (Attempt ${retries + 1}/${maxRetries})`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Add signal to options
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
        }
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // Handle various error status codes
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Received 404 for ${url}, retrying...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        }
        
        if (response.status === 504) {
          console.warn(`Gateway timeout for ${url}, retrying...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          continue;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Fetch error (Attempt ${retries + 1}/${maxRetries}):`, error);
      lastError = error;
      retries++;
      
      if (error.name === 'AbortError') {
        console.warn(`Request timeout for ${url}`);
      }
      
      if (retries < maxRetries) {
        // Exponential backoff with jitter
        const backoff = Math.min(1000 * Math.pow(2, retries) + Math.random() * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, backoff));
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