import React from 'react';
import {
    Box,
    Backdrop,
    Typography,
    alpha
} from '@mui/material';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Professional loading overlay with backdrop
const LoadingOverlay = ({ open, theme }) => (
    <Backdrop 
        open={open} 
        sx={{ 
            position: 'absolute', 
            zIndex: 20,
            backgroundColor: theme.palette.mode === 'dark' ? alpha('#000', 0.8) : alpha('#fff', 0.8),
            backdropFilter: 'blur(4px)'
        }}
    >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <LoadingSpinner size={40} compact={true} />
            <Typography variant="body2" color="text.secondary">
                Generating content...
            </Typography>
        </Box>
    </Backdrop>
);

export default LoadingOverlay;
