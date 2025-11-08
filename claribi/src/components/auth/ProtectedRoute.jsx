import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import authService from '../../services/auth';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [tokenValidating, setTokenValidating] = useState(false);
  
  // Check token validity on mount
  useEffect(() => {
    const validateToken = async () => {
      if (currentUser && !loading) {
        const token = authService.getToken();
        if (token && authService.isTokenExpired(token)) {
          setTokenValidating(true);
          try {
            await authService.refreshAccessToken();
            console.log('Token refreshed successfully in ProtectedRoute');
          } catch (error) {
            console.error('Token refresh failed in ProtectedRoute:', error);
            // The API interceptor will handle redirect to login
          } finally {
            setTokenValidating(false);
          }
        }
      }
    };

    validateToken();
  }, [currentUser, loading]);

  // Only show loading indicator when actually checking auth (not on initial render)
  const isAuthenticating = loading && location.pathname !== '/login';
  const isTokenRefreshing = tokenValidating;

  // Show loading state while checking authentication or refreshing token
  if (isAuthenticating || isTokenRefreshing) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If authenticated, render the children
  return children;
};

export default ProtectedRoute; 