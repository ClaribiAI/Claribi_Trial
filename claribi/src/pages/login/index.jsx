import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MicrosoftIcon from './MicrosoftIcon';
import authService from '../../services/auth';

const MAX_RETRIES = 3;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [backendError, setBackendError] = useState(false);

  // If user is already authenticated, redirect to home
  useEffect(() => {
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

  // Verify using all available methods to maximize chance of success
  const verifyWithAllMethods = (directToken = null) => {
    console.log("Verifying with all available methods");
    
    // Get debug info to understand current state
    authService.getDebugInfo()
      .then(debugData => {
        console.log("Auth debug info before verification:", debugData);
      })
      .catch(err => {
        console.warn("Could not get debug info:", err);
      });
    
    // Try cookie verification first if we have auth_status cookie
    const hasAuthCookie = document.cookie.split(';').some(c => c.trim().startsWith('auth_status='));
    
    let verificationPromise;
    
    if (hasAuthCookie) {
      console.log("Auth cookie detected, trying cookie verification first");
      verificationPromise = authService.verifyTokenCookie();
    } else if (directToken) {
      console.log("Direct token available, trying URL parameter verification");
      verificationPromise = authService.verifyDirectToken(directToken);
    } else {
      console.log("No token indicators found, using standard verification");
      verificationPromise = authService.verifyAuth();
    }
    
    verificationPromise
      .then(data => {
        if (data.success) {
          console.log("Primary verification method succeeded:", data);
          handleSuccessfulVerification(data);
        } else if (directToken && !hasAuthCookie) {
          // If direct token verification failed, try cookie verification
          console.log("Direct token verification failed, trying cookie verification");
          return authService.verifyTokenCookie();
        } else if (hasAuthCookie && directToken) {
          // If cookie verification failed, try direct token
          console.log("Cookie verification failed, trying direct token");
          return authService.verifyDirectToken(directToken);
        } else {
          // If all direct methods failed, try standard verification
          console.log("Primary verification failed, trying standard verification");
          return authService.verifyAuth();
        }
      })
      .then(data => {
        // This will only execute if we chained to a fallback method
        if (data && data.success) {
          console.log("Fallback verification method succeeded:", data);
          handleSuccessfulVerification(data);
        } else if (data && !data.success && retryCount < MAX_RETRIES) {
          // If verification still failed but we have retries left
          console.log(`Verification attempt ${retryCount + 1} failed, retrying...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => verifyWithAllMethods(directToken), 1000);
        } else if (data) {
          // If verification failed after all methods
          console.error("All verification methods failed:", data.error);
          setErrorMessage(`Authentication failed: ${data.error}`);
          setVerifying(false);
        }
      })
      .catch(err => {
        if (retryCount < MAX_RETRIES) {
          console.log(`Verification attempt ${retryCount + 1} failed with error, retrying...`, err);
          setRetryCount(prev => prev + 1);
          setTimeout(() => verifyWithAllMethods(directToken), 1000);
        } else {
          console.error("Error during all verification methods:", err);
          setErrorMessage("Authentication verification failed. Please try again.");
          setVerifying(false);
          
          // Check if it's a network error
          if (err.message && err.message.includes('Network Error')) {
            setBackendError(true);
          }
        }
      });
  };
  
  // Handle successful verification
  const handleSuccessfulVerification = (data) => {
    console.log("Verification successful:", data);
    
    // Clear URL parameters to avoid reuse
    const url = new URL(window.location);
    url.searchParams.delete('auth');
    url.searchParams.delete('direct_token');
    window.history.replaceState({}, '', url);
    
    // Do a final session check to ensure the session is established
    console.log("Performing final session check before redirect");
    authService.sessionCheck()
      .then(checkResult => {
        if (checkResult.success) {
          console.log("Session check successful, redirecting");
          
          // Check if there's a pending share token
          const pendingShareToken = sessionStorage.getItem('pendingShareToken');
          if (pendingShareToken) {
            // We'll remove the token in the useEffect when we confirm the user is logged in
            console.log("Pending share token found, will redirect to shared project");
            // Force refresh to trigger the useEffect that handles redirect
            setTimeout(() => {
              window.location.reload();
            }, 300);
          } else {
            // Force refresh the page to update the user context
            setTimeout(() => {
              window.location.href = '/';
            }, 300);
          }
        } else {
          console.error("Session check failed, auth flow incomplete");
          // Try to get more debug info
          authService.getDebugInfo()
            .then(debugData => {
              console.log("Auth debug info after session check failure:", debugData);
              setErrorMessage("Authentication appeared to succeed, but session verification failed. Please try again.");
              setVerifying(false);
            })
            .catch(e => {
              console.error("Could not get debug info:", e);
              setErrorMessage("Authentication appeared to succeed, but session verification failed. Please try again.");
              setVerifying(false);
            });
        }
      })
      .catch(err => {
        console.error("Error during final session check:", err);
        setErrorMessage("Error during session verification. Please try again.");
        setVerifying(false);
      });
  };

  // Check URL parameters and cookies for auth status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const authStatus = urlParams.get('auth');
    const directToken = urlParams.get('direct_token');
    const shareToken = urlParams.get('share_token');
    
    // Check for auth_status cookie
    const hasAuthCookie = document.cookie.split(';').some(c => c.trim().startsWith('auth_status='));

    // Save share token if present
    if (shareToken) {
      sessionStorage.setItem('pendingShareToken', shareToken);
    }
    
    if (errorMsg) {
      // Replace '+' with spaces to properly display the error message
      setErrorMessage(errorMsg.replace(/\+/g, ' '));
    }

    if (authStatus === 'success' || hasAuthCookie) {
      setShowSuccess(true);
      setVerifying(true);
      setRetryCount(0); // Reset retry count
      
      // Use our all-methods verification approach
      verifyWithAllMethods(directToken);
    }
  }, [location]);

  const handleMicrosoftLogin = () => {
    // Use the login method with an error handler
    login((errorMessage) => {
      setBackendError(true);
      setErrorMessage(errorMessage || "Cannot connect to the authentication server. Please ensure the backend is running and try again.");
    });
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  // Show loading spinner only if we're checking authentication status
  // or verifying after redirect
  if ((loading && currentUser !== null) || verifying) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(45deg, #f3e5f5 0%, #e1bee7 100%)',
      }}
    >
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          Authentication successful! Verifying...
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
          boxShadow: '0 8px 24px rgba(156, 39, 176, 0.2)',
        }}
      >
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
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
            src="/claribi-logo.svg"
            alt="Claribi Logo"
            sx={{ width: 64, height: 64, mx: 'auto', mb: 2 }}
          />
          <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
            claribi
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