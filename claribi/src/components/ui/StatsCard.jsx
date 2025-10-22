import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    useTheme,
    alpha
} from '@mui/material';
import {
    Clock,
    FileText,
    ChatCircle
} from '@phosphor-icons/react';

const StatsCard = () => {
    const theme = useTheme();
    
    // Use theme colors for consistency
    const accentColor = theme.palette.primary.main;
    const textColor = theme.palette.text.primary;
    const secondaryTextColor = theme.palette.text.secondary;
    
    // Dummy data for demonstration
    const stats = [
        {
            icon: Clock,
            label: 'Time Saved',
            value: '24.5',
            unit: 'hours',
            color: accentColor
        },
        {
            icon: FileText,
            label: 'Documents Generated',
            value: '12',
            unit: 'reports',
            color: accentColor
        },
        {
            icon: ChatCircle,
            label: 'Chat Queries',
            value: '156',
            unit: 'questions',
            color: accentColor
        }
    ];

    return (
        <Card
            sx={{
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 8px 32px rgba(0,0,0,0.4)' 
                        : '0 8px 32px rgba(0,0,0,0.12)'
                }
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Typography 
                    variant="subtitle1" 
                    sx={{ 
                        fontWeight: 600,
                        color: textColor,
                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                        mb: 2,
                        textAlign: 'center',
                        fontSize: '1rem'
                    }}
                >
                    Usage Statistics
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, justifyContent: 'space-between' }}>
                    {stats.map((stat, index) => {
                        const IconComponent = stat.icon;
                        return (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    bgcolor: theme.palette.mode === 'dark' 
                                        ? alpha(theme.palette.background.default, 0.5)
                                        : alpha(theme.palette.background.default, 0.3),
                                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    transition: 'all 0.2s ease',
                                    flex: 1,
                                    minWidth: 0,
                                    '&:hover': {
                                        bgcolor: theme.palette.mode === 'dark' 
                                            ? alpha(theme.palette.background.default, 0.7)
                                            : alpha(theme.palette.background.default, 0.5),
                                        borderColor: alpha(accentColor, 0.3),
                                        transform: 'translateY(-1px)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 1.5,
                                        bgcolor: alpha(accentColor, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 0.5
                                    }}
                                >
                                    <IconComponent 
                                        size={18} 
                                        color={accentColor}
                                    />
                                </Box>
                                
                                <Box sx={{ textAlign: 'center', width: '100%' }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: textColor,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                            lineHeight: 1.1,
                                            mb: 0.25,
                                            fontSize: '1.25rem'
                                        }}
                                    >
                                        {stat.value}
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{
                                                color: secondaryTextColor,
                                                fontWeight: 500,
                                                ml: 0.5,
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {stat.unit}
                                        </Typography>
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: secondaryTextColor,
                                            fontSize: '0.7rem',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'block',
                                            lineHeight: 1.2
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
};

export default StatsCard;
