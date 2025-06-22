import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingSpinner = ({ size = 40 }) => {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      width="100%" 
      height="100%" 
      minHeight="200px"
    >
      <CircularProgress 
        size={size} 
        sx={{ 
          color: '#555555',
        }}
      />
    </Box>
  );
};

export default LoadingSpinner; 