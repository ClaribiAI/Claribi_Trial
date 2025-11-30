import React from 'react';
import {
    Box,
    Typography,
    useTheme,
    IconButton
} from '@mui/material';
import {
    Clock,
    FileText,
    ChatCircle,
    ArrowClockwise
} from '@phosphor-icons/react';

const StatsCards = ({ statsData, statsLoading, onRefresh }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const yellowColor = '#FCC000';
    // Use same background as table rows
    const statsBg = theme.palette.background.paper;
    const dividerColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

    // Animated loading dots component
    const LoadingDots = () => (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '& .dot': {
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    bgcolor: theme.palette.text.primary,
                    animation: 'pulse 1.4s ease-in-out infinite',
                    '&:nth-of-type(1)': {
                        animationDelay: '0s'
                    },
                    '&:nth-of-type(2)': {
                        animationDelay: '0.2s'
                    },
                    '&:nth-of-type(3)': {
                        animationDelay: '0.4s'
                    }
                },
                '@keyframes pulse': {
                    '0%, 60%, 100%': {
                        opacity: 0.3,
                        transform: 'scale(0.8)'
                    },
                    '30%': {
                        opacity: 1,
                        transform: 'scale(1.2)'
                    }
                }
            }}
        >
            <Box className="dot" />
            <Box className="dot" />
            <Box className="dot" />
        </Box>
    );

    const StatItem = ({ icon: Icon, label, value, isLoading }) => (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                px: 4,
                py: 3
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Icon size={40} color={yellowColor} weight="fill" />
            </Box>
            <Box 
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 1.5,
                        lineHeight: 1.2
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        color: theme.palette.text.primary,
                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                        lineHeight: 1.2,
                        fontSize: '2.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '2.5rem'
                    }}
                >
                    {isLoading ? <LoadingDots /> : value}
                </Typography>
            </Box>
        </Box>
    );

    return (
        <Box 
            sx={{ 
                pt: 1,
                pb: 3,
                px: 4,
                bgcolor: theme.palette.background.chat
            }}
        >
            <Box 
                display="flex"
                sx={{
                    flexDirection: { xs: 'column', sm: 'row' },
                    bgcolor: statsBg,
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 20px rgba(0,0,0,0.3)' 
                        : '0 4px 20px rgba(0,0,0,0.08)',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    position: 'relative'
                }}
            >
                {/* Refresh Icon Button */}
                {onRefresh && (
                    <IconButton
                        onClick={onRefresh}
                        disabled={statsLoading}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                                bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                            },
                            transition: 'all 0.2s ease',
                            zIndex: 1,
                            padding: '4px'
                        }}
                    >
                        <ArrowClockwise 
                            size={18} 
                            weight="regular"
                            style={{
                                transform: statsLoading ? 'rotate(360deg)' : 'none',
                                transition: statsLoading ? 'transform 1s linear infinite' : 'transform 0.3s ease'
                            }}
                        />
                    </IconButton>
                )}
                {/* Hours Saved KPI */}
                <StatItem
                    icon={Clock}
                    label="Hours saved"
                    value={statsData.timeSaved}
                    isLoading={statsLoading}
                />
                
                {/* Vertical Divider */}
                <Box
                    sx={{
                        width: '1px',
                        bgcolor: dividerColor,
                        my: 2,
                        display: { xs: 'none', sm: 'block' }
                    }}
                />

                {/* Documents Generated KPI */}
                <StatItem
                    icon={FileText}
                    label="Documents generated"
                    value={statsData.documentsGenerated}
                    isLoading={statsLoading}
                />

                {/* Vertical Divider */}
                <Box
                    sx={{
                        width: '1px',
                        bgcolor: dividerColor,
                        my: 2,
                        display: { xs: 'none', sm: 'block' }
                    }}
                />

                {/* Chat Queries KPI */}
                <StatItem
                    icon={ChatCircle}
                    label="Chat queries"
                    value={statsData.chatQueries}
                    isLoading={statsLoading}
                />
            </Box>
        </Box>
    );
};

export default StatsCards;

