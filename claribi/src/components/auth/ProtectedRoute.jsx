import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  
  // Only show loading indicator when actually checking auth (not on initial render)
  const isAuthenticating = loading && location.pathname !== '/login';

  // Show loading state while checking authentication
  if (isAuthenticating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If a specific role is required, check if user has the role
  if (requiredRole && !currentUser.role === requiredRole) {
    // Could redirect to unauthorized page or fallback to a default route
    return <Navigate to="/" replace />;
  }

  // If authenticated and has the required role, render the children
  return children;
};

export default ProtectedRoute; 