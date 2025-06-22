import React from 'react';
import { Container, Typography, Box, Paper, Link } from '@mui/material';

const HelpPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4 }}>
        Help Center
      </Typography>
      
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Welcome to our help center! This page provides resources to help you get started with our platform.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This is a placeholder for the help center. In a real application, you would find tutorials, FAQs, and guides here.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Find answers to common questions about our platform and features.
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                How do I create a new project?
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Can I share my projects with team members?
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                How do I export my project data?
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Contact Support
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Need more help? Our support team is available to assist you.
          </Typography>
          <Link href="#" underline="hover" color="primary">
            <Typography variant="body2">Contact Support</Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default HelpPage;