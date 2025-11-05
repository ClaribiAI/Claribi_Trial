import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/auth';

// Define available roles - map backend Azure AD roles to frontend roles
export const ROLES = {
  // Backend Azure AD roles
  CLARIBI_ADMIN: 'Claribi_Admin',
  CLARIBI_USER: 'Claribi_User', 
  CLARIBI_DEVELOPER: 'Claribi_Developer',
  // Legacy frontend roles for backward compatibility
  DATA_ANALYST: 'data-analyst',
  USER: 'user'
};

// Create the context
const AuthContext = createContext();

// Custom hook for easy access to the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch the user profile from the backend using JWT tokens
  const fetchUserProfile = async () => {
    try {
      // Don't fetch profile if on login page
      if (window.location.pathname === '/login') {
        // Clear user state when on login page (handles logout redirect case)
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Check URL parameters for JWT token
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const jwtToken = urlParams.get('token'); // JWT token from login callback

      let data;
      
      // After successful auth redirect, store JWT token and bootstrap session
      if (authStatus === 'success' && jwtToken) {
          console.log("Storing JWT token from login callback");
          authService.setToken(jwtToken);
          
          // Clean up URL after storing token
          const url = new URL(window.location);
          url.searchParams.delete('auth');
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url);
          
          // Verify the token
          data = await authService.verifyAuth();
      }
      // Otherwise use the regular profile endpoint with stored token
      else {
          data = await authService.getUserProfile();
      }
      
      if (data.success) {
        // Transform backend user data to match frontend expected format
        const userData = data.data;
        
        setCurrentUser({
          username: userData.display_id,
          role: userData.role, // Use actual backend role from Azure AD
          backendRole: userData.role, // Store for reference
          ms_object_id: userData.ms_object_id,
          organization_id: userData.organization_id,
          // Add Graph API specific data if available
          graph_data: userData.graph_data || null
        });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      
      if (err.response?.status === 403) {
        // Handle 403 errors
        setCurrentUser(null);
        setError(err.response?.data?.message || "Access forbidden");
      } else {
        setCurrentUser(null);
        setError(err.message || "Failed to authenticate");
      }
    } finally {
      setLoading(false);
    }
  };

  // Proactive token refresh function
  const checkAndRefreshToken = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      // Check if token expires in the next 5 minutes (300 seconds)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - currentTime;

      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        console.log('Token expires soon, refreshing proactively...');
        await authService.refreshAccessToken();
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
    }
  };

  // Start proactive token refresh monitoring
  const startTokenRefreshMonitoring = () => {
    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Check every minute
    const interval = setInterval(checkAndRefreshToken, 60000);
    setRefreshInterval(interval);
  };

  // Stop token refresh monitoring
  const stopTokenRefreshMonitoring = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Fetch user profile on component mount and when location changes
  useEffect(() => {
    fetchUserProfile();
    
    // Add event listener for navigation
    const handleNavigation = () => {
      // If navigating to a non-login page, check auth status
      if (window.location.pathname !== '/login') {
        fetchUserProfile();
      }
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      stopTokenRefreshMonitoring();
    };
  }, []);

  // Start token refresh monitoring when user is authenticated
  useEffect(() => {
    if (currentUser) {
      startTokenRefreshMonitoring();
    } else {
      stopTokenRefreshMonitoring();
    }
  }, [currentUser]);

  // Login using Microsoft AD
  const login = () => {
    setError(null);
    
    // Use the frontend origin to go through the Vite proxy for consistent cookie handling
    const frontendOrigin = window.location.origin; // https://localhost:5173
    
    // The frontend URL to redirect back to after a successful login
    const redirectUri = encodeURIComponent(frontendOrigin);

    // Construct the URL using the proxy path - this ensures cookies are handled consistently
    window.location.href = `${frontendOrigin}/api/auth/login?redirect_uri=${redirectUri}`;
  };

  // Logout user
  const logout = () => {
    try {
      // Stop token refresh monitoring
      stopTokenRefreshMonitoring();
      
      setError(null);
      
      // Clear JWT token from localStorage
      authService.removeToken();
      
      // Clear current user state
      setCurrentUser(null);
      
      // Navigate directly to logout endpoint which will:
      // 1. Redirect to Microsoft logout
      // 2. Microsoft will redirect back to our frontend login page
      window.location.href = '/api/auth/logout';
    } catch (err) {
      console.error("Logout failed:", err);
      setError(err.message || "Logout failed");
      
      // Clear user state and redirect on error
      setCurrentUser(null);
      authService.removeToken();
      window.location.href = '/';
    }
  };

  // Check if user has specific role
  const hasRole = (role) => currentUser?.role === role;

  // Check if user is a data analyst (legacy compatibility)
  const isDataAnalyst = () => currentUser?.role === ROLES.DATA_ANALYST;

  // Check if user is a regular user (legacy compatibility)
  const isUser = () => currentUser?.role === ROLES.USER;

  // Check if user has admin role
  const isAdmin = () => currentUser?.role === ROLES.CLARIBI_ADMIN;

  // Check if user has developer role
  const isDeveloper = () => currentUser?.role === ROLES.CLARIBI_DEVELOPER;

  // Check if user has any valid role
  const hasValidRole = () => currentUser?.role && Object.values(ROLES).includes(currentUser.role);

  // Fetch Graph API data for the current user
  const fetchGraphData = async () => {
    try {
      const response = await authService.getGraphData();
      return response;
    } catch (err) {
      console.error("Failed to fetch Graph API data:", err);
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    hasRole,
    isDataAnalyst,
    isUser,
    isAdmin,
    isDeveloper,
    hasValidRole,
    fetchUserProfile,
    fetchGraphData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 