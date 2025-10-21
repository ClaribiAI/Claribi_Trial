import React from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Card,
    CardContent,
    CircularProgress,
    useTheme,
    alpha
} from '@mui/material';
import {
    InfoIcon,
    GearSixIcon
} from '@phosphor-icons/react';

// Enhanced Recommendation Card with modern styling
const RecommendationCard = ({ recommendation, onApply, isApplying }) => {
    const theme = useTheme();
    
    const getPriorityConfig = (priority) => {
        switch (priority) {
            case 'high': 
                return { 
                    color: 'error', 
                    bgcolor: alpha(theme.palette.error.main, 0.1)
                };
            case 'medium': 
                return { 
                    color: 'warning', 
                    bgcolor: alpha(theme.palette.warning.main, 0.1)
                };
            case 'low': 
                return { 
                    color: 'success', 
                    bgcolor: alpha(theme.palette.success.main, 0.1)
                };
            default: 
                return { 
                    color: 'info', 
                    icon: <InfoIcon size={16} />,
                    bgcolor: alpha(theme.palette.info.main, 0.1)
                };
        }
    };

    const getComplexityConfig = (complexity) => {
        switch (complexity) {
            case 'high': return { color: 'secondary', label: 'Complex' };
            case 'medium': return { color: 'primary', label: 'Moderate' };
            case 'low': return { color: 'info', label: 'Simple' };
            default: return { color: 'default', label: complexity };
        }
    };

    const priorityConfig = getPriorityConfig(recommendation.priority);
    const complexityConfig = getComplexityConfig(recommendation.complexity);

    return (
        <Card 
            sx={{ 
                mb: 3, 
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                }
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {recommendation.title}
                    </Typography>
                    <Box display="flex" gap={1}>
                        <Chip 
                            icon={priorityConfig.icon}
                            label={`${recommendation.priority} priority`}
                            color={priorityConfig.color}
                            size="small"
                            variant="outlined"
                            sx={{ 
                                textTransform: 'capitalize',
                                bgcolor: priorityConfig.bgcolor
                            }}
                        />
                        <Chip 
                            label={`${complexityConfig.label} complexity`}
                            color={complexityConfig.color}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                </Box>
                
                <Box mb={2}>
                    <Chip 
                        label={recommendation.category}
                        variant="filled"
                        size="small"
                        sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            fontWeight: 500
                        }}
                    />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {recommendation.description}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {recommendation.applicable_files.map((file, index) => (
                            <Chip 
                                key={index}
                                label={file}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                    fontSize: '0.75rem',
                                    bgcolor: alpha(theme.palette.info.main, 0.05)
                                }}
                            />
                        ))}
                    </Box>
                    
                    <Button
                        onClick={() => onApply(recommendation.id)}
                        disabled={isApplying}
                        variant="contained"
                        size="small"
                        startIcon={isApplying ? <CircularProgress size={16} /> : <GearSixIcon size={16} />}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            minWidth: 140
                        }}
                    >
                        {isApplying ? 'Applying...' : 'Apply Fix'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default RecommendationCard;
