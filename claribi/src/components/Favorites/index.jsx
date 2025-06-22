import React from 'react';
import { Box, Grid, Paper } from '@mui/material';
import FavoriteGroupsList from './FavoriteGroupsList';
import FavoriteUrlsList from './FavoriteUrlsList';

const Favorites = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <FavoriteGroupsList />
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <FavoriteUrlsList />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Favorites; 