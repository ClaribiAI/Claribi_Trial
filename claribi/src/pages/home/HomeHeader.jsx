import React from 'react';
import { Typography, Box } from '@mui/material';

const HomeHeader = ({ username = 'Mike', children }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' },
      justifyContent: 'space-between', 
      alignItems: { xs: 'flex-start', md: 'center' }, 
      gap: { xs: 2, md: 0 },
      mb: 4,
      width: '100%'
    }}>
      <Box>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            fontSize: { xs: '1.8rem', md: '2rem' },
            color: '#333',
            mb: 0.5
          }}
        >
          {getGreeting()}, {username}!
        </Typography>
        <Typography 
          variant="body1" 
          sx={{
            color: 'rgba(0, 0, 0, 0.6)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem'
          }}
        >
          Let's make this day productive.
        </Typography>
      </Box>
      {children}
    </Box>
  );
};

export default HomeHeader;