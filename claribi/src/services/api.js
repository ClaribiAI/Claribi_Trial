import axios from 'axios';
import { normalizeApiError } from './errorUtils';
import { notify } from '../contexts/notificationBus';

const isDev = import.meta.env && import.meta.env.DEV;

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env?.VITE_BACKEND_URL || '/', // Use backend URL in prod; dev falls back to proxy
  withCredentials: true, // Important for sending/receiving cookies for auth
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
    // Add JWT token to all requests if available
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      if (isDev) console.log(`🔐 JWT token added to ${config.method.toUpperCase()} request to ${config.url}`);
    } else {
      if (isDev) console.log(`⚠️ No JWT token available for ${config.method.toUpperCase()} request to ${config.url}`);
    }

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
      
      // Handle authentication errors
      if (status === 401) {
        const currentPath = window.location.pathname;
        
        // Don't redirect if already on the login page
        if (currentPath === '/login') {
          return Promise.reject(error);
        }
        
        // Don't retry if this request already failed after refresh
        if (config._retry) {
          if (isDev) console.log('Token refresh already attempted, redirecting to login');
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Attempt token refresh before redirecting to login
        try {
          if (isDev) console.log('401 error detected, attempting token refresh...');
          config._retry = true;
          
          // Import authService dynamically to avoid circular dependency
          const authService = (await import('./auth')).default;
          await authService.refreshAccessToken();
          
          if (isDev) console.log('Token refreshed successfully, retrying original request');
          // Retry the original request with the new token
          return api.request(config);
        } catch (refreshError) {
          if (isDev) console.error('Token refresh failed, redirecting to login:', refreshError);
          // Only redirect to login if refresh fails
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
      
      if (status === 403) {
        // Forbidden - user doesn't have access
        if (isDev) console.error('You do not have permission to access this resource');
      }
      
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