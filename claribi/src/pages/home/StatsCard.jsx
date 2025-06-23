import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatsCard = ({ title, value, trend = false, error = null }) => {
  return (
    <Paper 
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        backgroundColor: error ? '#FFF5F5' : '#F8FAFC',
        border: '1px solid',
        borderColor: error ? '#FED7D7' : '#E2E8F0',
        borderRadius: 2,
        '&:hover': {
          backgroundColor: error ? '#FFF5F5' : '#F1F5F9'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: error ? '#E53E3E' : '#64748B',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              color: error ? '#E53E3E' : '#1A202C',
              fontSize: '1.5rem'
            }}
          >
            {error ? 'Error' : value}
          </Typography>
          {trend && !error && (
            <TrendingUp sx={{ color: '#10B981', fontSize: '1.25rem' }} />
          )}
        </Box>
        
        {error && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#E53E3E',
              fontSize: '0.75rem',
              mt: -0.5
            }}
          >
            Failed to load data
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StatsCard;