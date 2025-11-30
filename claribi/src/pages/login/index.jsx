import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Snackbar, Alert, useTheme } from '@mui/material';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import MicrosoftIcon from './MicrosoftIcon';

const isDev = import.meta.env && import.meta.env.DEV;

// Sanitize URL parameter to prevent XSS
const sanitizeUrlParam = (param) => {
  if (!param) return '';
  // Remove any HTML tags and encode special characters
  return param
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 200); // Limit length
};

const LoginPage = () => {
  const { login, currentUser, loading } = useAuth();
  const { showNotification } = useNotification();
  const theme = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);

  // Note: Redirect logic for authenticated users is now handled by LoginWrapper component
  // AuthContext handles token extraction, storage, and verification automatically

  // Check URL parameters for auth status and errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const authStatus = urlParams.get('auth');
    const jwtToken = urlParams.get('token');
    
    if (errorMsg) {
      // Sanitize error message to prevent XSS
      const sanitizedError = sanitizeUrlParam(errorMsg);
      showNotification(sanitizedError || 'An error occurred during authentication', 'error');
    }

    // Show success message if we have a token or auth=success
    // AuthContext will handle token extraction and verification
    if (authStatus === 'success' || jwtToken) {
      setShowSuccess(true);
    }
  }, [showNotification]);

  // Show loading when AuthContext is verifying authentication after redirect
  const isVerifying = loading && currentUser === null && showSuccess;

  const handleMicrosoftLogin = () => {
    login();
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  // Show loading spinner while AuthContext is verifying or if user becomes authenticated
  if (isVerifying || (loading && currentUser !== null)) {
    return <LoadingSpinner />;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(45deg, #424242 0%, #303030 100%)'
          : 'linear-gradient(45deg, #f5f5f5 0%, #e0e0e0 100%)',
      }}
    >
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          Sign-in successful! Connecting to Microsoft Graph API...
        </Alert>
      </Snackbar>

      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: '400px',
          p: 5,
          borderRadius: 4,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(255, 193, 7, 0.2)',
        }}
      >
        
        <Box sx={{ mb: 4 }}>
          <Box
            component="img"
            src={theme.palette.mode === 'dark' ? '/claribi_icon_logo_dark.png' : '/claribi_icon_logo_light.png'}
            alt="Claribi Logo"
            sx={{ 
              width: 48, 
              height: 48, 
              mx: 'auto', 
              mb: 2,
              objectFit: 'contain'
            }}
          />
          <Typography variant="h3" component="h1" fontWeight="bold" sx={{ mb: 0 }}>
            clari<span className="bi-yellow">bi</span>
          </Typography>
          <Typography variant="h5" component="h2" fontWeight="normal" sx={{ mb: 1.5, color: 'text.secondary', mt: -0.5 }}>
            console
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Effortless access to meaningful insights.
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          startIcon={<MicrosoftIcon />}
          onClick={handleMicrosoftLogin}
          sx={{
            py: 1.5,
            backgroundColor: '#0078d4',
            color: 'white',
            '&:hover': {
              backgroundColor: '#106ebe',
            },
            borderRadius: '24px',
            fontWeight: 'medium',
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Sign in with Microsoft
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage; 