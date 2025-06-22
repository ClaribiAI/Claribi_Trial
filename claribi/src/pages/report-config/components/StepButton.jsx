import React from 'react';
import { Box, Typography } from '@mui/material';

const StepButton = ({ label, active, onClick, icon }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      px: 3,
      py: 2,
      cursor: 'pointer',
      borderBottom: '2px solid',
      borderColor: active ? '#1a73e8' : 'transparent',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
    }}
  >
    {icon && (
      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
    )}
    <Typography
      variant="subtitle1"
      sx={{
        color: active ? '#1a73e8' : '#555555',
        fontWeight: active ? 600 : 400,
        fontFamily: "'Nunito Sans', sans-serif",
      }}
    >
      {label}
    </Typography>
  </Box>
);

export default StepButton; 