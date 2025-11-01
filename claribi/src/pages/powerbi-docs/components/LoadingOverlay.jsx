import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Typography,
    alpha,
    useMediaQuery
} from '@mui/material';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Professional loading overlay positioned relative to section container
const LoadingOverlay = ({ open, theme }) => {
    const containerRef = useRef(null);
    const [indicatorTop, setIndicatorTop] = useState('50%');
    const isMobile = useMediaQuery('(max-width:600px)');

    useEffect(() => {
        if (!open || !containerRef.current) return;

        const updatePosition = () => {
            if (!containerRef.current) return;
            
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Calculate visible portion of the section
            const containerTop = containerRect.top + scrollTop;
            const containerBottom = containerTop + containerRect.height;
            const visibleTop = Math.max(scrollTop, containerTop);
            const visibleBottom = Math.min(scrollTop + viewportHeight, containerBottom);
            const visibleHeight = visibleBottom - visibleTop;
            
            // Center the indicator in the visible area
            // Calculate the position relative to the container's top
            const centerOfVisible = visibleTop + (visibleHeight / 2);
            const relativeTop = centerOfVisible - containerTop;
            
            // Set as percentage or pixel value relative to container
            setIndicatorTop(`${relativeTop}px`);
        };

        updatePosition();
        const handleScroll = () => {
            requestAnimationFrame(updatePosition);
        };
        const handleResize = () => {
            requestAnimationFrame(updatePosition);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, [open]);

    if (!open) return null;

    return (
        <Box
            ref={containerRef}
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
                    top: isMobile ? '50%' : indicatorTop,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2.5,
                    maxWidth: '90%',
                    width: 'auto',
                    pointerEvents: 'none',
                    transition: 'top 0.15s ease-out'
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
