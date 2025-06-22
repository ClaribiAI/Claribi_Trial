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

  // Fetch the user profile from the backend
  const fetchUserProfile = async () => {
    try {
      // Don't fetch profile if on login page
      if (window.location.pathname === '/login') {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Check URL parameters for auth token to see if we just returned from auth flow
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const authToken = urlParams.get('token');
      const directToken = urlParams.get('direct_token');
      
      // If direct token is available, use it for verification (most reliable)
      let data;
      if (directToken) {
        console.log("Using direct token verification in auth context");
        data = await authService.verifyDirectToken(directToken);
        
        // Always clean up URL after token verification attempt
        // This prevents multiple verification attempts with the same token
        const url = new URL(window.location);
        url.searchParams.delete('auth');
        url.searchParams.delete('direct_token');
        window.history.replaceState({}, '', url);
        
        if (!data.success) {
          // If token verification failed, try the standard profile endpoint
          console.log("Direct token verification failed, falling back to profile endpoint");
          data = await authService.getUserProfile();
        }
      }
      // If standard token is available, use verify-auth endpoint
      else if (authStatus === 'success' && authToken) {
        console.log("Using verify-auth endpoint for authentication check");
        data = await authService.verifyAuth();
        
        // Clean up URL after verification
        const url = new URL(window.location);
        url.searchParams.delete('auth');
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url);
      } 
      // Otherwise use the regular profile endpoint
      else {
        data = await authService.getUserProfile();
      }
      
      if (data.success) {
        // Transform backend user data to match frontend expected format
        const userData = data.data;
        setCurrentUser({
          username: userData.display_id,
          role: ROLES.DATA_ANALYST, // Set default role or map from backend
          ms_object_id: userData.ms_object_id,
          organization_id: userData.organization_id
        });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setCurrentUser(null);
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
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
    };
  }, []);

  // Login using Microsoft AD
  const login = (onError) => {
    // Try to check if the backend is available
    fetch('/api/health-check').catch(err => {
      console.error("Backend server appears to be down:", err);
      if (onError) {
        onError("Cannot connect to authentication server");
      }
      return;
    });
    
    // Add current URL as redirect, so after login we return to the frontend
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `/auth/login?redirect_uri=${redirectUri}`;
  };

  // Logout user
  const logout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error("Logout failed:", err);
      setError(err.message || "Logout failed");
    }
  };

  // Toggle between roles (maintain this functionality for development/testing)
  const toggleRole = () => {
    if (!currentUser) return;
    
    setCurrentUser(prevUser => ({
      ...prevUser,
      role: prevUser.role === ROLES.DATA_ANALYST ? ROLES.USER : ROLES.DATA_ANALYST
    }));
  };

  // Check if user has specific role
  const hasRole = (role) => currentUser?.role === role;

  // Check if user is a data analyst
  const isDataAnalyst = () => currentUser?.role === ROLES.DATA_ANALYST;

  // Check if user is a regular user
  const isUser = () => currentUser?.role === ROLES.USER;

  // Value to be provided to consuming components
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    toggleRole,
    hasRole,
    isDataAnalyst,
    isUser,
    ROLES
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 