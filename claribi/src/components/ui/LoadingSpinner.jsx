import React from 'react';
import { Box } from '@mui/material';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 40, compact = false }) => {
  const squareSize = size / 2.5; // Each square is smaller than the total size to create spacing
  
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      width={compact ? "auto" : "100%"} 
      height={compact ? "auto" : "100%"} 
      minHeight={compact ? "auto" : "200px"}
    >
      <div 
        className="loading-spinner"
        style={{
          width: size,
          height: size,
        }}
      >
        <div 
          className="square square-black top-left"
          style={{
            width: squareSize,
            height: squareSize,
          }}
        />
        <div 
          className="square square-yellow top-right"
          style={{
            width: squareSize,
            height: squareSize,
          }}
        />
        <div 
          className="square square-yellow bottom-left"
          style={{
            width: squareSize,
            height: squareSize,
          }}
        />
        <div 
          className="square square-black bottom-right"
          style={{
            width: squareSize,
            height: squareSize,
          }}
        />
      </div>
    </Box>
  );
};

export default LoadingSpinner; 