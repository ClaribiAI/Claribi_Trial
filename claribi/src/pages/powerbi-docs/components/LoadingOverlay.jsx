import React from 'react';
import {
    Box,
    Typography,
    alpha
} from '@mui/material';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Professional loading overlay positioned relative to section container
const LoadingOverlay = ({ open, theme }) => {
    // Simplified positioning - always center the overlay
    // This works reliably regardless of section visibility state

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                backgroundColor: theme.palette.mode === 'dark' 
                    ? alpha('#000', 0.65) 
                    : alpha('#000', 0.4),
                background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha('#000', 0.7)} 0%, ${alpha('#1a1a1a', 0.6)} 100%)`
                    : `linear-gradient(135deg, ${alpha('#000', 0.45)} 0%, ${alpha('#1a1a1a', 0.35)} 100%)`,
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out'
            }}
        >
            <Box 
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2.5,
                    maxWidth: '90%',
                    width: 'auto',
                    pointerEvents: 'none'
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 0.5
                    }}
                >
                    <LoadingSpinner size={52} compact={true} />
                </Box>
                <Typography 
                    variant="body1" 
                    sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        fontSize: '1rem',
                        letterSpacing: '0.015em',
                        textAlign: 'center',
                        fontFamily: "'Nunito Sans', sans-serif",
                        lineHeight: 1.5,
                        animation: 'fadeIn 0.3s ease-out',
                        '@keyframes fadeIn': {
                            '0%': {
                                opacity: 0
                            },
                            '100%': {
                                opacity: 1
                            }
                        }
                    }}
                >
                    Generating content...
                </Typography>
            </Box>
        </Box>
    );
};

export default LoadingOverlay;
