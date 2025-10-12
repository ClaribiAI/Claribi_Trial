import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import GraphApiData from '../../components/ui/GraphApiData';
import ProtectedRoute from '../../components/auth/ProtectedRoute';

const GraphApiTestPage = () => {
  return (
    <ProtectedRoute>
      <Container maxWidth="md">
        <Box py={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Microsoft Graph API Integration Test
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            This page demonstrates the integration with Microsoft Graph API. 
            The data below is fetched directly from Microsoft Graph using the Graph API flow.
          </Typography>
          
          <GraphApiData />
        </Box>
      </Container>
    </ProtectedRoute>
  );
};

export default GraphApiTestPage;
