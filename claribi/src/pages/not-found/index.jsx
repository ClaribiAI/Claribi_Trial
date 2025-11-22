import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { House, Warning } from '@phosphor-icons/react';

const NotFound = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        px: 3,
        py: 8,
        bgcolor: theme.palette.background.chat,
        textAlign: 'center'
      }}
    >
      <Box
        sx={{
          maxWidth: 600,
          width: '100%'
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 4
          }}
        >
          <Box
            sx={{
              p: 4,
              borderRadius: 4,
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha('#FCC000', 0.1) 
                : alpha(theme.palette.error.main, 0.08),
              color: theme.palette.mode === 'dark' 
                ? '#FCC000' 
                : theme.palette.error.main,
              border: `2px solid ${
                theme.palette.mode === 'dark' 
                  ? alpha('#FCC000', 0.2) 
                  : alpha(theme.palette.error.main, 0.15)
              }`,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 8px 32px rgba(0,0,0,0.3)' 
                : '0 8px 32px rgba(0,0,0,0.08)'
            }}
          >
            <Warning size={64} weight="duotone" />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: theme.palette.text.primary,
            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' }
          }}
        >
          Page Not Found
        </Typography>

        {/* Description */}
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.secondary,
            mb: 6,
            maxWidth: 500,
            mx: 'auto',
            lineHeight: 1.6,
            fontWeight: 400,
            fontSize: { xs: '1rem', sm: '1.125rem' }
          }}
        >
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back to the home page.
        </Typography>

        {/* Home Button */}
        <Button
          variant="contained"
          startIcon={<House size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
          onClick={handleGoHome}
          sx={{
            borderRadius: 3,
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            height: 48,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            textTransform: 'none',
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Return to Home
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound;

