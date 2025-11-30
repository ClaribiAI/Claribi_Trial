import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Snackbar, Alert, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import MicrosoftIcon from './MicrosoftIcon';
import authService from '../../services/auth';

const MAX_RETRIES = 3;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, loading } = useAuth();
  const { showNotification } = useNotification();
  const theme = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [backendError, setBackendError] = useState(false);

  // Note: Redirect logic for authenticated users is now handled by LoginWrapper component


  const verifyAuthentication = async () => {
    try {
      setRetryCount(0);
      const data = await authService.verifyAuth();
      
      if (data.success) {
        console.log("Authentication verified successfully");
        handleSuccessfulVerification(data);
      } else {
        console.error("Authentication verification failed:", data.error);
        showNotification(`Authentication failed: ${data.error}`, 'error');
        setVerifying(false);
      }
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        console.log(`Verification attempt ${retryCount + 1} failed, retrying...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => verifyAuthentication(), 1000);
      } else {
        console.error("All verification attempts failed:", err);
        showNotification("Authentication verification failed after multiple attempts. Please try logging in again.", 'error');
        setVerifying(false);
      }
    }
  };

  const handleSuccessfulVerification = (data) => {
    console.log("Verification successful, redirecting...");
    setVerifying(false);
    
    // Navigate to home page using window.location to avoid HashRouter issues
    window.location.href = '/';
  };

  // Check URL parameters for auth status - this should run first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const authStatus = urlParams.get('auth');
    
    if (errorMsg) {
      // Handle error types
      showNotification(errorMsg.replace(/\+/g, ' '), 'error');
    }

    if (authStatus === 'success') {
      setShowSuccess(true);
      setVerifying(true);
      setRetryCount(0); // Reset retry count
      
      verifyAuthentication();
    }
  }, [location, showNotification]);

  const handleMicrosoftLogin = () => {
    login();
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  if ((loading && currentUser !== null) || verifying) {
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