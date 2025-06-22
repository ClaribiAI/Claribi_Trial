import axios from 'axios';

// Function to get CSRF token from cookies
const getCSRFToken = () => {
  const name = 'csrf_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return '';
};

// Function to fetch a new CSRF token
const fetchCSRFToken = async () => {
  try {
    const response = await axios.get('/auth/csrf-token', {
      withCredentials: true
    });
    return response.data.csrf_token;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/', // Base URL will be the current domain (thanks to the Vite proxy)
  withCredentials: true, // Important for sending/receiving cookies for auth
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add timeout to prevent hanging requests
  timeout: 15000
});

// Add a request interceptor
api.interceptors.request.use(
  async config => {
    // Include CSRF token in POST, PUT, DELETE requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      let csrfToken = getCSRFToken();
      
      // If no token found, try to fetch a new one
      if (!csrfToken) {
        csrfToken = await fetchCSRFToken();
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('No CSRF token available');
      }
      
      // Set appropriate Content-Type header based on data type
      if (config.data) {
        if (config.data instanceof FormData) {
          // Let axios set the correct boundary for FormData
          config.headers['Content-Type'] = 'multipart/form-data';
        } else if (typeof config.data === 'object') {
          config.headers['Content-Type'] = 'application/json';
        }
      }
    }

    // Log outgoing requests in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || {});
    }
    
    return config;
  },
  error => {
    // Handle request errors
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  response => {
    // Any successful response handling
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Response from ${response.config.url}:`, response.data);
    }

    // If response is not in JSON format, convert it
    if (typeof response.data === 'string' && response.data.trim()) {
      try {
        response.data = JSON.parse(response.data);
      } catch (e) {
        console.warn('Response is not valid JSON, using as is:', response.data);
        // Wrap non-JSON responses in a data object for consistency
        response.data = { 
          text: response.data,
          _isTextResponse: true
        };
      }
    }
    
    return response;
  },
  error => {
    // Log and handle errors
    console.error('API Response Error:', error);
    
    // Format error response for better handling
    if (error.response) {
      const { status, data } = error.response;
      
      console.error(`HTTP Error ${status}:`, data);
      
      // Handle authentication errors
      if (status === 401) {
        const currentPath = window.location.pathname;
        // Don't redirect if already on the login page
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      }
      
      if (status === 403) {
        // Forbidden - user doesn't have access
        console.error('You do not have permission to access this resource');
      }

      // Try to extract more useful error info
      error.userMessage = getErrorMessage(error);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server');
      error.userMessage = 'The server did not respond. Please check your connection and try again.';
    } else {
      // Something else happened in setting up the request
      console.error('Error in request setup:', error.message);
      error.userMessage = 'An error occurred while setting up the request.';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to extract user-friendly error messages
function getErrorMessage(error) {
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }
  
  const { data, status } = error.response;
  
  // Try to extract message from various data formats
  if (data) {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data.message) {
      return data.message;
    }
    
    if (data.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }
  }
  
  // Default messages based on status code
  switch (status) {
    case 400: return 'Bad request. Please check your input.';
    case 401: return 'You are not authorized. Please log in again.';
    case 403: return 'You do not have permission to access this resource.';
    case 404: return 'The requested resource was not found.';
    case 500: return 'Server error. Please try again later.';
    default: return `Error ${status}. Please try again.`;
  }
}

export default api; 