import React from 'react';
import { Button as MuiButton } from '@mui/material';

const Button = ({ children, variant = 'contained', color = 'black', size = 'medium', startIcon, endIcon, onClick, sx, ...props }) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      sx={{ 
        borderRadius: '28px', 
        fontWeight: 'bold',
        padding: '8px 16px',
        textTransform: 'none',
        ...sx
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;