import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Alert, Snackbar, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import MicrosoftIcon from './MicrosoftIcon';
import authService from '../../services/auth';

const MAX_RETRIES = 3;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, loading } = useAuth();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [backendError, setBackendError] = useState(false);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    // Don't redirect if there's an organization error
    const storedOrgError = sessionStorage.getItem('organizationError');
    if (storedOrgError === 'true') {
      return;
    }
    
    // Only redirect if we've explicitly checked and user is authenticated
    if (currentUser && !loading) {
      // Check if there is a pending share token
      const pendingShareToken = sessionStorage.getItem('pendingShareToken');
      if (pendingShareToken) {
        // Remove the token from storage
        sessionStorage.removeItem('pendingShareToken');
        // Redirect to shared project handler
        navigate(`/shared-project/${pendingShareToken}`);
      } else {
        navigate('/');
      }
    }
  }, [currentUser, loading, navigate]);

  // Prevent automatic refresh when there are organization access errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    
    if (errorMsg === 'organization_not_allowed') {
      // Don't allow refresh when there's an org error - user needs to see the message
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [location]);

  const verifyAuthentication = async () => {
    try {
      setRetryCount(0);
      const data = await authService.verifyAuth();
      
      if (data.success) {
        console.log("Authentication verified successfully");
        handleSuccessfulVerification(data);
      } else {
        console.error("Authentication verification failed:", data.error);
        setErrorMessage(`Authentication failed: ${data.error}`);
        setVerifying(false);
      }
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Verification attempt ${retryCount + 1} failed, retrying...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => verifyAuthentication(), 1000);
      } else {
        console.error("All verification attempts failed:", err);
        setErrorMessage("Authentication verification failed after multiple attempts. Please try logging in again.");
        setVerifying(false);
      }
    }
  };

  const handleSuccessfulVerification = (data) => {
    console.log("Verification successful, redirecting...");
    setVerifying(false);
    
    // Check if there is a pending share token
    const pendingShareToken = sessionStorage.getItem('pendingShareToken');
    if (pendingShareToken) {
      // Remove the token from storage
      sessionStorage.removeItem('pendingShareToken');
      // Redirect to shared project handler
      navigate(`/shared-project/${pendingShareToken}`);
    } else {
      // Navigate to home page
      navigate('/');
    }
  };

  // Check URL parameters for auth status - this should run first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const authStatus = urlParams.get('auth');
    const shareToken = urlParams.get('share_token');
    
    // Save share token if present
    if (shareToken) {
      sessionStorage.setItem('pendingShareToken', shareToken);
    }
    
    // Handle organization access error immediately
    if (errorMsg === 'organization_not_allowed') {
      sessionStorage.setItem('organizationError', 'true');
      sessionStorage.setItem('organizationErrorMessage', 'Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.');
      setErrorMessage('Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.');
      return; // Don't proceed with other logic
    }
    
    // Check for stored organization error
    const storedOrgError = sessionStorage.getItem('organizationError');
    if (storedOrgError === 'true') {
      const storedErrorMessage = sessionStorage.getItem('organizationErrorMessage');
      setErrorMessage(storedErrorMessage || 'Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.');
      // Don't clear the stored error yet - let the user see it
    } else if (errorMsg) {
      // Handle other error types
      setErrorMessage(errorMsg.replace(/\+/g, ' '));
    }

    if (authStatus === 'success') {
      setShowSuccess(true);
      setVerifying(true);
      setRetryCount(0); // Reset retry count
      
      verifyAuthentication();
    }
  }, [location]);

  const handleMicrosoftLogin = () => {
    // Clear any stored organization errors when attempting to login
    sessionStorage.removeItem('organizationError');
    sessionStorage.removeItem('organizationErrorMessage');
    setErrorMessage(null);
    
    login();
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  // Don't show loading spinner if there's an organization error
  const storedOrgError = sessionStorage.getItem('organizationError');
  if (storedOrgError === 'true') {
    // Show the error message instead of loading
  } else if ((loading && currentUser !== null) || verifying) {
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
        {(errorMessage || storedOrgError === 'true') && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              '& .MuiAlert-message': {
                fontSize: '0.9rem',
                lineHeight: 1.4,
              }
            }}
          >
            {errorMessage || sessionStorage.getItem('organizationErrorMessage')}
            {(errorMessage?.includes('organization') || storedOrgError === 'true') && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" component="a" href="https://www.claribi.ai" target="_blank" sx={{ color: 'inherit', textDecoration: 'underline' }}>
                  Visit www.claribi.ai to purchase a plan
                </Typography>
              </Box>
            )}
          </Alert>
        )}
        
        {backendError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Backend server connection error. Please make sure the backend server is running at https://127.0.0.1:5000.
          </Alert>
        )}
        
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
            clar<span className="bi-yellow">bi</span>
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