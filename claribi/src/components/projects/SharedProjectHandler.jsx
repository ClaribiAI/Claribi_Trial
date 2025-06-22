import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';

/**
 * Component to handle shared project access response
 * Redirects appropriately based on status:
 * - If access is granted and user is logged in -> redirect to projects page
 * - If access is granted but user is not logged in -> redirect to login page
 * - If access is not granted -> redirect to login page with error message
 */
const SharedProjectHandler = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useParams(); // Get token from URL params
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Only proceed if we have a token and auth state is resolved
    if (token && !loading) {
      handleSharedLink(token);
    }
  }, [token, currentUser, loading]);

  // Handle the shared link access
  const handleSharedLink = async (token) => {
    try {
      setProcessing(true);
      
      console.log('Processing shared link with token:', token);
      
      // Make direct request to the backend to get access status
      // Use the correct content type to ensure it's treated as an API request
      const response = await axios.get(`${API_BASE_URL}/shared-project/${token}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const { success, error, redirect, project } = response.data;
      console.log('Shared link response:', response.data);
      
      if (success) {
        // Access was granted
        if (currentUser) {
          // User is logged in, redirect to project
          if (redirect) {
            // Extract the project ID from the redirect URL
            const projectIdMatch = redirect.match(/projects\/(\d+)/);
            if (projectIdMatch && projectIdMatch[1]) {
              navigate(`/projects/${projectIdMatch[1]}`);
            } else {
              window.location.href = redirect; // Use full redirect if we can't extract ID
            }
          } else if (project && project.id) {
            navigate(`/projects/${project.id}`);
          } else {
            navigate('/projects');
          }
        } else {
          // User is not logged in, redirect to login
          sessionStorage.setItem('pendingShareToken', token);
          navigate('/login');
        }
      } else if (error === 'Authentication required') {
        // User needs to log in
        // Store the token for after login
        sessionStorage.setItem('pendingShareToken', token);
        navigate('/login');
      } else {
        // Other error
        setError(error || 'This share link is invalid or has expired.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Error handling shared project access:', error);
      setError('An error occurred processing the shared link. Please try again.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  // Show loading while processing
  if (processing) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Processing shared project access...
        </Typography>
      </Box>
    );
  }

  // Show error if there is one
  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          p: 3 
        }}
      >
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 500 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Redirecting to login page...
        </Typography>
      </Box>
    );
  }

  // Default fallback - should not usually be seen
  return null;
};

export default SharedProjectHandler; 