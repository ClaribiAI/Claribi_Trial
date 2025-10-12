import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Person,
  Email,
  Business,
  Groups,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const GraphApiData = () => {
  const { fetchGraphData, currentUser } = useAuth();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGraphData();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load Graph API data:', err);
      setError(err.message || 'Failed to load Graph API data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadGraphData();
    }
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Microsoft Graph API Data
          </Typography>
          <Button
            startIcon={<Refresh />}
            onClick={loadGraphData}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {graphData && !loading && (
          <Box>
            {/* Basic User Information */}
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                User Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Person />
                  </ListItemIcon>
                  <ListItemText
                    primary="Display Name"
                    secondary={graphData.displayName || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={graphData.userPrincipalName || graphData.mail || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Business />
                  </ListItemIcon>
                  <ListItemText
                    primary="Job Title"
                    secondary={graphData.jobTitle || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Business />
                  </ListItemIcon>
                  <ListItemText
                    primary="Department"
                    secondary={graphData.department || 'N/A'}
                  />
                </ListItem>
              </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Groups Information */}
            {graphData.groups && graphData.groups.length > 0 && (
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Groups sx={{ mr: 1 }} />
                  Groups ({graphData.groups.length})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {graphData.groups.map((group, index) => (
                    <Chip
                      key={index}
                      label={group}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Additional Information */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Additional Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="User ID"
                    secondary={graphData.id || 'N/A'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Account Enabled"
                    secondary={graphData.accountEnabled ? 'Yes' : 'No'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="User Type"
                    secondary={graphData.userType || 'N/A'}
                  />
                </ListItem>
              </List>
            </Box>
          </Box>
        )}

        {!graphData && !loading && !error && (
          <Alert severity="info">
            No Graph API data available. Click refresh to load data.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default GraphApiData;
