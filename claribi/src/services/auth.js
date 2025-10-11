import api from './api';

/**
 * Auth service for handling authentication-related API calls
 */
const authService = {
  /**
   * Get the current user profile
   * @returns {Promise} Response with user data
   */
  getUserProfile: async () => {
    try {
      // Skip profile check if on login page
      if (window.location.pathname === '/login') {
        return { success: false };
      }
      
      const response = await api.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      // If on login page, don't treat 401 as an error
      if (error.response?.status === 401 && window.location.pathname === '/login') {
        return { success: false };
      }
      
      // Check if this is an organization access error
      if (error.response?.status === 403 && 
          error.response?.data?.error === 'organization_not_allowed') {
        // For organization errors, we want to throw them so they can be caught by AuthContext
        throw error;
      }
      
      throw error;
    }
  },

  /**
   * Verify authentication after login redirect
   * @returns {Promise} Response with user data
   */
  verifyAuth: async () => {
    try {
      const response = await api.get('/api/auth/verify-auth');
      return response.data;
    } catch (error) {
      console.error("Auth verification failed:", error);
      
      // Check if this is an organization access error
      if (error.response?.status === 403 && 
          error.response?.data?.error === 'organization_not_allowed') {
        // For organization errors, we want to throw them so they can be caught by AuthContext
        throw error;
      }
      
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout the current user
   * @returns {Promise} Response indicating success or failure
   */
  logout: async () => {
    try {
      const response = await api.get('/api/auth/logout');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if the user is authenticated
   * @returns {Promise<boolean>} True if authenticated, false otherwise
   */
  isAuthenticated: async () => {
    try {
      // Skip auth check if on login page
      if (window.location.pathname === '/login') {
        return false;
      }
      
      const response = await api.get('/api/auth/profile');
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if the session is valid
   * @returns {Promise} Response indicating session validity
   */
  sessionCheck: async () => {
    try {
      const response = await api.get('/api/auth/session-check');
      return response.data;
    } catch (error) {
      console.error("Session check failed:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || "Session check failed" 
      };
    }
  }
};

export default authService; 