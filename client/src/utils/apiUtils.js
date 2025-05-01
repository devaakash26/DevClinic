import axios from 'axios';
import { getApiUrl } from '../services/apiService';

export const createAxiosInstance = () => {
  const instance = axios.create();
  
  // Add a request interceptor to set the Authorization header
  instance.interceptors.request.use(
    (config) => {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      
      // If token exists, add it to the Authorization header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Process URL through our API service
      if (config.url && !config.url.startsWith('http')) {
        config.url = getApiUrl(config.url);
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Create and export a default instance
export const api = createAxiosInstance();

/**
 * Wrapper for fetch that uses API URL and optional authentication
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Fetch options
 * @param {boolean} useAuth - Whether to include the auth token
 * @returns {Promise} - Fetch promise
 */
export const apiFetch = (endpoint, options = {}, useAuth = true) => {
  const url = getApiUrl(endpoint);
  
  // Set up headers
  const headers = options.headers || {};
  
  // Add auth header if required
  if (useAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  // Set content type to JSON by default for POST/PUT requests if not specified
  if (!headers['Content-Type'] && (options.method === 'POST' || options.method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }
  
  return fetch(url, {
    ...options,
    headers
  });
};

export default {
  api,
  apiFetch,
  getApiUrl
}; 