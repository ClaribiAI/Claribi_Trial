import api from './api';

/**
 * JWT Token management utilities
 */
const tokenManager = {
  getToken: () => {
    return localStorage.getItem('jwt_token');
  },
  
  setToken: (token) => {
    localStorage.setItem('jwt_token', token);
  },
  
  removeToken: () => {
    localStorage.removeItem('jwt_token');
  },
  
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
};

/**
 * Auth service for handling authentication-related API calls with JWT tokens
 */
const authService = {
  /**
   * Get the current user profile using JWT token
   * @returns {Promise} Response with user data
   */
  getUserProfile: async () => {
    try {
      // Skip profile check if on login page
      if (window.location.pathname === '/login') {
        return { success: false };
      }
      
      const token = tokenManager.getToken();
      if (!token || tokenManager.isTokenExpired(token)) {
        return { success: false };
      }
      
      const response = await api.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      // If on login page, don't treat 401 as an error
      if (error.response?.status === 401 && window.location.pathname === '/login') {
        return { success: false };
      }
      
      throw error;
    }
  },

  /**
   * Verify authentication after login redirect using JWT token
   * @returns {Promise} Response with user data
   */
  verifyAuth: async () => {
    try {
      const token = tokenManager.getToken();
      if (!token || tokenManager.isTokenExpired(token)) {
        return { success: false, error: 'No valid token' };
      }
      
      const response = await api.get('/api/auth/verify-auth');
      return response.data;
    } catch (error) {
      console.error("Auth verification failed:", error);
      
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout the current user by clearing JWT token
   * @returns {Promise} Response indicating success or failure
   */
  logout: async () => {
    try {
      // Clear JWT token from localStorage
      tokenManager.removeToken();
      
      // Redirect to Microsoft logout
      window.location.href = '/api/auth/logout';
    } catch (error) {
      // Even if there's an error, clear the token
      tokenManager.removeToken();
      throw error;
    }
  },

  /**
   * Check if the user is authenticated using JWT token
   * @returns {Promise<boolean>} True if authenticated, false otherwise
   */
  isAuthenticated: async () => {
    try {
      // Skip auth check if on login page
      if (window.location.pathname === '/login') {
        return false;
      }
      
      const token = tokenManager.getToken();
      if (!token || tokenManager.isTokenExpired(token)) {
        return false;
      }
      
      const response = await api.get('/api/auth/profile');
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if the session is valid using JWT token
   * @returns {Promise} Response indicating session validity
   */
  sessionCheck: async () => {
    try {
      const token = tokenManager.getToken();
      if (!token || tokenManager.isTokenExpired(token)) {
        return { success: false, error: 'No valid token' };
      }
      
      const response = await api.get('/api/auth/session-check');
      return response.data;
    } catch (error) {
      console.error("Session check failed:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || "Session check failed" 
      };
    }
  },

  /**
   * Get user data from Microsoft Graph API using JWT token
   * @returns {Promise} Response with Graph API data
   */
  getGraphData: async () => {
    try {
      const token = tokenManager.getToken();
      if (!token || tokenManager.isTokenExpired(token)) {
        throw new Error('No valid token');
      }
      
      const response = await api.get('/api/auth/graph-data');
      return response.data;
    } catch (error) {
      console.error("Graph API data fetch failed:", error);
      
      throw error;
    }
  },

  /**
   * Set JWT token (used after successful login)
   * @param {string} token - JWT token
   */
  setToken: (token) => {
    tokenManager.setToken(token);
  },

  /**
   * Get current JWT token
   * @returns {string|null} JWT token or null
   */
  getToken: () => {
    return tokenManager.getToken();
  },

  /**
   * Check if current token is expired
   * @returns {boolean} True if expired, false otherwise
   */
  isTokenExpired: () => {
    const token = tokenManager.getToken();
    return tokenManager.isTokenExpired(token);
  },

  /**
   * Remove JWT token (used for logout)
   */
  removeToken: () => {
    tokenManager.removeToken();
  },

  /**
   * Refresh access token using refresh token from httpOnly cookie
   * @returns {Promise<string>} New access token
   */
  refreshAccessToken: async () => {
    try {
      const response = await api.get('/api/auth/refresh');
      if (response.data.success) {
        tokenManager.setToken(response.data.access_token);
        console.log('Access token refreshed successfully');
        return response.data.access_token;
      }
      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear token on refresh failure
      tokenManager.removeToken();
      throw error;
    }
  }
};

export default authService; 