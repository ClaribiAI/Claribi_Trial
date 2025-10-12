import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/auth';

// Define available roles
export const ROLES = {
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
  const [organizationAccessError, setOrganizationAccessError] = useState(false);

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
          role: ROLES.DATA_ANALYST, // Set default role for claribi (no role switching)
          ms_object_id: userData.ms_object_id,
          organization_id: userData.organization_id,
          // Add Graph API specific data if available
          graph_data: userData.graph_data || null
        });
        setOrganizationAccessError(false); // Clear any previous organization errors
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      
      // Check if this is an organization access error
      if (err.response?.status === 403 && 
          err.response?.data?.error === 'organization_not_allowed') {
        setOrganizationAccessError(true);
        setCurrentUser(null);
        setError('Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.');
      } else if (err.response?.status === 403) {
        // Handle other 403 errors
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

  // Fetch user profile on component mount and when location changes
  useEffect(() => {
    // Don't fetch profile if there's a stored organization error
    const storedOrgError = sessionStorage.getItem('organizationError');
    if (storedOrgError === 'true') {
      setLoading(false);
      setOrganizationAccessError(true);
      setError('Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.');
      return;
    }
    
    fetchUserProfile();
    
    // Add event listener for navigation
    const handleNavigation = () => {
      // If navigating to a non-login page, check auth status
      if (window.location.pathname !== '/login') {
        fetchUserProfile();
      }
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    // Add event listener for beforeunload to clear organization errors
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('organizationError');
      sessionStorage.removeItem('organizationErrorMessage');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Login using Microsoft AD
  const login = () => {
    // Clear any previous organization access errors when attempting to login
    setOrganizationAccessError(false);
    setError(null);
    
    // Clear all organization error storage
    sessionStorage.removeItem('organizationError');
    sessionStorage.removeItem('organizationErrorMessage');
    
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
      // Clear organization access error on logout
      setOrganizationAccessError(false);
      setError(null);
      
      // Clear all organization error storage
      sessionStorage.removeItem('organizationError');
      sessionStorage.removeItem('organizationErrorMessage');
      
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
      window.location.href = '/login';
    }
  };

  // Check if user has specific role
  const hasRole = (role) => currentUser?.role === role;

  // Check if user is a data analyst
  const isDataAnalyst = () => currentUser?.role === ROLES.DATA_ANALYST;

  // Check if user is a regular user
  const isUser = () => currentUser?.role === ROLES.USER;

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
    organizationAccessError,
    login,
    logout,
    hasRole,
    isDataAnalyst,
    isUser,
    fetchUserProfile,
    fetchGraphData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 