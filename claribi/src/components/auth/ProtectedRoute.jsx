import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box } from '@mui/material';
import LoadingSpinner from '../ui/LoadingSpinner';
import OrganizationAccessError from '../ui/OrganizationAccessError';

const ProtectedRoute = ({ children, requiredRole, requiredMicrosoftRole }) => {
  const { currentUser, loading, organizationAccessError } = useAuth();
  const location = useLocation();
  
  // Only show loading indicator when actually checking auth (not on initial render)
  const isAuthenticating = loading && location.pathname !== '/login';

  // Show loading state while checking authentication
  if (isAuthenticating) {
    return <LoadingSpinner />;
  }

  // Show organization access error if present
  if (organizationAccessError) {
    return <OrganizationAccessError variant="page" />;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If a specific display role is required, check if user has the role
  if (requiredRole && currentUser.role !== requiredRole) {
    // Could redirect to unauthorized page or fallback to a default route
    return <Navigate to="/" replace />;
  }

  // If a specific Microsoft role is required, check if user has the role
  if (requiredMicrosoftRole && currentUser.microsoftRole !== requiredMicrosoftRole) {
    // Could redirect to unauthorized page or fallback to a default route
    return <Navigate to="/" replace />;
  }

  // If authenticated and has the required role, render the children
  return children;
};

export default ProtectedRoute; 