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
      
      const response = await api.get('/auth/profile');
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
   * Verify the authentication token in the HTTP-only cookie
   * @returns {Promise} Response with user data
   */
  verifyTokenCookie: async () => {
    try {
      // Check if auth_status cookie exists (indicates we should have an auth_token cookie)
      const hasAuthCookie = document.cookie.split(';').some(c => c.trim().startsWith('auth_status='));
      
      if (!hasAuthCookie) {
        console.log("No auth status cookie found");
        return { success: false, error: 'No auth cookie found' };
      }
      
      // Get debugging info first
      await api.get('/auth/debug')
        .then(response => {
          console.log("Auth debug info:", response.data);
        })
        .catch(err => {
          console.warn("Could not get auth debug info:", err);
        });
        
      // Now try to verify the token from the cookie
      const response = await api.get('/auth/verify-token');
      console.log(`Token cookie verified successfully via ${response.data.source || 'backend'}`);
      return response.data;
    } catch (error) {
      console.error("Token cookie verification failed:", error);
      
      // Try to get debug info after failure
      try {
        const debugInfo = await api.get('/auth/debug');
        console.log("Auth debug info after failure:", debugInfo.data);
      } catch (e) {
        console.warn("Could not get auth debug info after failure:", e);
      }
      
      // If it's a 401 error, attempt profile retrieval
      if (error.response?.status === 401) {
        console.log("Token verification failed but session might still be valid");
        // Try to get user profile as a fallback
        try {
          const profileResponse = await api.get('/auth/profile');
          if (profileResponse.data.success) {
            console.log("Profile check successful after token verification failed");
            return {
              success: true,
              data: profileResponse.data.data,
              already_used: true
            };
          }
        } catch (profileError) {
          console.error("Profile check failed after token verification failed:", profileError);
        }
      }
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  },

  /**
   * Verify a direct authentication token (legacy/fallback support)
   * @param {string} token - The direct authentication token
   * @returns {Promise} Response with user data
   */
  verifyDirectToken: async (token) => {
    try {
      if (!token) {
        return { success: false, error: 'No token provided' };
      }
      
      const response = await api.get(`/auth/verify-token/${token}`);
      console.log(`Token verified successfully via ${response.data.source || 'backend'}`);
      return response.data;
    } catch (error) {
      console.error("Direct token verification failed:", error);
      
      // If it's a 401 error for a token not found, attempt profile retrieval
      if (error.response?.status === 401 && 
          (error.response?.data?.error?.includes("Token not found") || 
           error.response?.data?.error?.includes("Invalid token"))) {
        console.log("Token not found but this could be because it was already used");
        // Try to get user profile as a fallback
        try {
          const profileResponse = await api.get('/auth/profile');
          if (profileResponse.data.success) {
            console.log("Profile check successful after token not found");
            return {
              success: true,
              data: profileResponse.data.data,
              already_used: true
            };
          }
        } catch (profileError) {
          console.error("Profile check failed after token not found:", profileError);
        }
      }
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  },

  /**
   * Get authentication debug info
   * @returns {Promise} Debug information about auth state
   */
  getDebugInfo: async () => {
    try {
      const response = await api.get('/auth/debug');
      return response.data;
    } catch (error) {
      console.error("Failed to get auth debug info:", error);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  },

  /**
   * Verify authentication after login redirect - tries multiple methods
   * More reliable than the profile endpoint for initial verification
   * @returns {Promise} Response with user data
   */
  verifyAuth: async () => {
    try {
      // First try standard auth verification
      const response = await api.get('/auth/verify-auth');
      return response.data;
    } catch (error) {
      console.error("Auth verification failed:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout the current user
   * @returns {Promise} Response indicating success or failure
   */
  logout: async () => {
    try {
      const response = await api.get('/auth/logout');
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
      
      const response = await api.get('/auth/profile');
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
      const response = await api.get('/auth/session-check');
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