import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert,
  Container 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OrganizationAccessError = ({ 
  error = null, 
  showLogoutButton = true,
  variant = 'page' // 'page' or 'inline'
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleContactSupport = () => {
    window.open('https://www.claribi.ai', '_blank');
  };

  const handleBackToLogin = () => {
    // Clear all organization errors before navigating to login
    sessionStorage.removeItem('organizationError');
    sessionStorage.removeItem('organizationErrorMessage');
    navigate('/login');
  };

  const errorContent = (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3, 
          textAlign: 'left',
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <Typography variant="h6" component="div" gutterBottom>
          Organization Access Restricted
        </Typography>
        <Typography variant="body1" component="div">
          Your organization has not yet purchased a plan. Please visit{' '}
          <Button 
            component="a" 
            href="https://www.claribi.ai" 
            target="_blank"
            sx={{ 
              textTransform: 'none', 
              p: 0, 
              minWidth: 'auto',
              color: 'inherit',
              textDecoration: 'underline',
              '&:hover': {
                textDecoration: 'underline',
                backgroundColor: 'transparent'
              }
            }}
          >
            www.claribi.ai
          </Button>{' '}
          to purchase a plan.
        </Typography>
      </Alert>

      {/* Action buttons - Back to Login, Sign Out (if enabled), and Visit Claribi */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button 
          variant="outlined" 
          onClick={handleBackToLogin}
          sx={{ minWidth: 120 }}
        >
          Back to Login
        </Button>
        {showLogoutButton && (
          <Button 
            variant="outlined" 
            onClick={handleLogout}
            sx={{ minWidth: 120 }}
          >
            Sign Out
          </Button>
        )}
        <Button 
          variant="contained" 
          onClick={handleContactSupport}
          sx={{ minWidth: 120 }}
        >
          Visit Claribi
        </Button>
      </Box>
    </Box>
  );

  if (variant === 'inline') {
    return errorContent;
  }

  // Full page variant
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: '600px',
            p: 4,
            borderRadius: 3,
            textAlign: 'center'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Box
              component="img"
              src={theme.palette.mode === 'dark' ? '/claribi_icon_logo_dark.png' : '/claribi_icon_logo_light.png'}
              alt="Claribi Logo"
              sx={{ 
                width: 60, 
                height: 60, 
                mx: 'auto', 
                mb: 2,
                opacity: 0.7,
                objectFit: 'contain'
              }}
            />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Access Restricted
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're unable to provide access at this time
            </Typography>
          </Box>

          {errorContent}
        </Paper>
      </Box>
    </Container>
  );
};

export default OrganizationAccessError; 