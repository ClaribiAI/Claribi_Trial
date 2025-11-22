import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    useTheme,
    alpha,
    Tooltip
} from '@mui/material';
import {
    WarningIcon,
    CheckCircleIcon,
    InfoIcon,
    XCircleIcon
} from '@phosphor-icons/react';

const DiagnosticsKPICard = ({ title, value, description, severity = 'info', icon: IconComponent, onClick }) => {
    const theme = useTheme();
    
    const getSeverityConfig = (severity) => {
        switch (severity) {
            case 'error':
                return {
                    color: theme.palette.error.main,
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                    borderColor: alpha(theme.palette.error.main, 0.2),
                    iconBg: alpha(theme.palette.error.main, 0.15)
                };
            case 'warning':
                return {
                    color: theme.palette.warning.main,
                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                    borderColor: alpha(theme.palette.warning.main, 0.2),
                    iconBg: alpha(theme.palette.warning.main, 0.15)
                };
            case 'success':
                return {
                    color: theme.palette.success.main,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    borderColor: alpha(theme.palette.success.main, 0.2),
                    iconBg: alpha(theme.palette.success.main, 0.15)
                };
            default:
                return {
                    color: theme.palette.info.main,
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                    borderColor: alpha(theme.palette.info.main, 0.2),
                    iconBg: alpha(theme.palette.info.main, 0.15)
                };
        }
    };
    
    const config = getSeverityConfig(severity);
    // Use the passed icon component if provided, otherwise fall back to default severity icons
    const displayIcon = IconComponent ? (
        <IconComponent 
            size={18} 
            weight="fill"
        />
    ) : (
        severity === 'error' ? <XCircleIcon size={18} weight="fill" /> :
        severity === 'warning' ? <WarningIcon size={18} weight="fill" /> :
        severity === 'success' ? <CheckCircleIcon size={18} weight="fill" /> :
        <InfoIcon size={18} weight="fill" />
    );
    
    return (
        <Tooltip title={description || title} arrow placement="top">
            <Card
                onClick={onClick}
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.shadows[2],
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: onClick ? 'pointer' : 'default',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        bgcolor: config.color,
                        opacity: 0.6
                    },
                    '&:hover': {
                        transform: onClick ? 'translateY(-2px)' : 'none',
                        boxShadow: onClick ? theme.shadows[4] : theme.shadows[2],
                        borderColor: onClick ? config.borderColor : alpha(theme.palette.divider, 0.12)
                    },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                        <Box
                            sx={{
                                p: 0.75,
                                borderRadius: 1.5,
                                bgcolor: config.iconBg,
                                color: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                width: 'fit-content',
                                '& svg': {
                                    color: config.color
                                }
                            }}
                        >
                            {displayIcon}
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                fontWeight: 500,
                                fontSize: '0.813rem',
                                flex: 1,
                                lineHeight: 1.4
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    {(() => {
                        // Robust parsing: matches patterns like "5/17 (29.4%)" or "0/7 (0.0%)"
                        // Also handles plain numbers like "0" or "5"
                        const valueStr = String(value || '');
                        const percentageMatch = valueStr.match(/^(.+?)\s*\(([^)]+%)\)\s*$/);
                        
                        if (percentageMatch) {
                            const mainValue = percentageMatch[1].trim();
                            const percentage = percentageMatch[2].trim();
                            
                            return (
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'baseline', 
                                        justifyContent: 'center',
                                        gap: 0.75,
                                        flexWrap: 'nowrap'
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        component="span"
                                        sx={{
                                            color: theme.palette.text.primary,
                                            fontWeight: 700,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                            lineHeight: 1.2,
                                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {mainValue}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            fontWeight: 500,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                            lineHeight: 1.2,
                                            fontSize: { xs: '0.688rem', sm: '0.75rem' },
                                            opacity: 0.8,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ({percentage})
                                    </Typography>
                                </Box>
                            );
                        }
                        
                        // Fallback: render as normal if no percentage pattern found
                        return (
                            <Typography
                                variant="h5"
                                sx={{
                                    color: theme.palette.text.primary,
                                    fontWeight: 700,
                                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                    lineHeight: 1.2,
                                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                    textAlign: 'center'
                                }}
                            >
                                {value}
                            </Typography>
                        );
                    })()}
                    </Box>
                </CardContent>
            </Card>
        </Tooltip>
    );
};

export default DiagnosticsKPICard;

