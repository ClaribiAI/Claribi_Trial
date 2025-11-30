import React from 'react';
import { Box, Alert, Link, useTheme } from '@mui/material';

const WarningAlert = ({ warning, onClose }) => {
    const theme = useTheme();

    // Helper function to render message with clickable links
    const renderMessageWithLinks = (message) => {
        if (!message) return message;
        
        // Convert to string if it's not already a string
        const messageStr = typeof message === 'string' ? message : String(message);
        
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = messageStr.split(urlRegex);
        
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                // Extract display text (remove https://)
                const displayText = part.replace(/^https?:\/\//, '');
                return (
                    <Link
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            color: 'inherit',
                            textDecoration: 'underline',
                            fontWeight: 500,
                            '&:hover': {
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        {displayText}
                    </Link>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    if (!warning) return null;

    return (
        <Box sx={{ px: 4, pt: 2 }}>
            <Alert 
                severity="warning" 
                onClose={onClose}
                sx={{ borderRadius: 2 }}
            >
                {renderMessageWithLinks(warning)}
            </Alert>
        </Box>
    );
};

export default WarningAlert;

