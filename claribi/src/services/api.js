import axios from 'axios';
import { normalizeApiError } from './errorUtils';
import { notify } from '../contexts/notificationBus';

const isDev = import.meta.env && import.meta.env.DEV;

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env?.VITE_BACKEND_URL || '/', // Use backend URL in prod; dev falls back to proxy
  // withCredentials: true is required for:
  // - Sending/receiving httpOnly cookies (refresh_token)
  // - Cross-origin requests between frontend and backend
  // - SameSite=None cookies (required for cross-origin)
  // This must match the backend's supports_credentials=True CORS setting
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add timeout to prevent hanging requests - increased for file uploads
  timeout: 120000 // 2 minutes for file uploads
});

// Add a request interceptor
api.interceptors.request.use(
  async config => {
    // Authentication removed - diagnostics is now public

    // Set appropriate Content-Type header based on data type
    if (config.data && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
      if (config.data instanceof FormData) {
        // Let axios set the correct boundary for FormData
        config.headers['Content-Type'] = 'multipart/form-data';
      } else if (typeof config.data === 'object') {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    // Log outgoing requests in development
    if (isDev) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || {});
    }
    
    return config;
  },
  error => {
    // Handle request errors
    if (isDev) console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  response => {
    // Any successful response handling
    if (isDev) {
      console.log(`API Response from ${response.config.url}:`, response.data);
    }

    // If response is not in JSON format, convert it
    if (typeof response.data === 'string' && response.data.trim()) {
      try {
        response.data = JSON.parse(response.data);
      } catch (e) {
        if (isDev) console.warn('Response is not valid JSON, using as is:', response.data);
        // Wrap non-JSON responses in a data object for consistency
        response.data = { 
          text: response.data,
          _isTextResponse: true
        };
      }
    }
    
    return response;
  },
  async error => {
    // Log and handle errors
    if (isDev) console.error('API Response Error:', error);
    
    // Format error response for better handling
    if (error.response) {
      const { status, data } = error.response;
      const config = error.config || {};
      
      if (isDev) console.error(`HTTP Error ${status}:`, data);
      
      // Authentication removed - diagnostics is now public
      // 401 and 403 errors are handled as regular errors
      
      // Try to extract more useful error info
      const normalized = normalizeApiError(error);
      error.userMessage = normalized.message;
      // Show global toast unless suppressed
      if (!config._suppressToast) {
        notify(normalized.message, 'error');
      }
    } else if (error.request) {
      // Request was made but no response received
      if (isDev) console.error('No response received from server');
      error.userMessage = 'The server did not respond. Please check your connection and try again.';
      notify(error.userMessage, 'error');
    } else {
      // Something else happened in setting up the request
      if (isDev) console.error('Error in request setup:', error.message);
      error.userMessage = 'An error occurred while setting up the request.';
      notify(error.userMessage, 'error');
    }
    
    return Promise.reject(error);
  }
);

export default api; 