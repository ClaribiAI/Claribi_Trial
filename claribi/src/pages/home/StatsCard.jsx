import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

const StatsCard = ({ title, value, icon, trend = true }) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: '16px', 
        bgcolor: 'white', 
        height: '100%', 
        width: '100%', 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <Typography 
          variant="body2" 
          gutterBottom 
          sx={{ 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'rgba(0, 0, 0, 0.6)',
            mb: 2
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              fontWeight: 700, 
              fontFamily: "'Inter', sans-serif", 
              fontSize: '2rem',
              color: '#333'
            }}
          >
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <FontAwesomeIcon icon={faArrowUp} size="sm" color="#4caf50" />
              <Typography 
                variant="body2" 
                color="success.main" 
                sx={{ 
                  ml: 0.5, 
                  fontFamily: "'Inter', sans-serif", 
                  fontWeight: 600
                }}
              >
                5%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default StatsCard;