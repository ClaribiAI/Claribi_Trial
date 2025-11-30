import React, { useMemo } from 'react';
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
import MarkdownRenderer from '../../../components/ui/MarkdownRenderer';

// Move configuration functions outside component to prevent recreation on every render
const getPriorityConfig = (priority, theme) => {
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

const getComplexityConfig = (complexity, theme) => {
    switch (complexity) {
        case 'high': 
            return { 
                color: 'secondary', 
                label: 'Complex',
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                variant: 'filled'
            };
        case 'medium': 
            return { 
                color: 'primary', 
                label: 'Moderate',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                variant: 'filled'
            };
        case 'low': 
            return { 
                color: 'info', 
                label: 'Simple',
                bgcolor: alpha(theme.palette.info.main, 0.1),
                variant: 'filled'
            };
        default: 
            return { 
                color: 'default', 
                label: complexity,
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                variant: 'filled'
            };
    }
};

// Enhanced Recommendation Card with modern styling
const RecommendationCard = ({ recommendation, onApply, isApplying }) => {
    const theme = useTheme();
    
    // Memoize expensive calculations
    const priorityConfig = useMemo(() => 
        getPriorityConfig(recommendation.priority, theme), 
        [recommendation.priority, theme]
    );
    
    const complexityConfig = useMemo(() => 
        getComplexityConfig(recommendation.complexity, theme), 
        [recommendation.complexity, theme]
    );
    
    const filteredFiles = useMemo(() => 
        recommendation.applicable_files.filter(file => file !== 'semantic_model' && file !== 'report'),
        [recommendation.applicable_files]
    );

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
                    <Box sx={{ fontWeight: 600, color: 'text.primary' }}>
                        <MarkdownRenderer 
                            content={recommendation.title}
                            sx={{
                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    margin: 0,
                                    lineHeight: 1.3
                                },
                                '& p': {
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    margin: 0,
                                    lineHeight: 1.3
                                },
                                '& strong': {
                                    fontWeight: 600,
                                    color: 'text.primary'
                                }
                            }}
                        />
                    </Box>
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
                            variant={complexityConfig.variant}
                            sx={{ 
                                textTransform: 'capitalize',
                                bgcolor: complexityConfig.bgcolor,
                                fontWeight: 500
                            }}
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
                
                <Box sx={{ mb: 3 }}>
                    <MarkdownRenderer 
                        content={recommendation.description}
                        sx={{
                            '& p': {
                                margin: 0,
                                lineHeight: 1.6,
                                color: 'text.secondary'
                            },
                            '& ul, & ol': {
                                margin: '8px 0',
                                paddingLeft: '20px',
                                '& li': {
                                    marginBottom: '4px',
                                    lineHeight: 1.6,
                                    color: 'text.secondary'
                                }
                            },
                            '& strong': {
                                fontWeight: 600,
                                color: 'text.primary'
                            },
                            '& code': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                fontFamily: 'monospace'
                            }
                        }}
                    />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {filteredFiles.map((file, index) => (
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
                        onClick={() => onApply(recommendation)}
                        disabled={isApplying}
                        variant="contained"
                        size="small"
                        startIcon={isApplying ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <GearSixIcon size={16} color={theme.palette.primary.contrastText} />}
                        sx={{ 
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            fontFamily: "'Nunito Sans', sans-serif",
                            fontWeight: 500,
                            textTransform: 'none',
                            borderRadius: 2,
                            minWidth: 140,
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                                color: theme.palette.primary.contrastText
                            },
                            '&:disabled': {
                                bgcolor: alpha(theme.palette.primary.main, 0.3)
                            }
                        }}
                    >
                        {isApplying ? 'Applying...' : 'Apply Fix'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default React.memo(RecommendationCard);

