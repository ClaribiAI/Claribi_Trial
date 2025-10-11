import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Collapse,
    IconButton,
    Chip,
    LinearProgress,
    useTheme,
    alpha,
    Tooltip
} from '@mui/material';
import {
    CaretDown,
    CaretRight,
    Brain,
    MagnifyingGlass,
    Database,
    CheckCircle,
    Clock,
    Warning,
    Info
} from '@phosphor-icons/react';

const ChainOfThought = ({ 
    ragDetails, 
    isVisible = true, 
    onToggle = null,
    compact = false,
    isCompleted = false
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(!compact);

    if (!ragDetails || !isVisible) return null;

    try {

    const {
        iterations = 0,
        max_iterations = 4,
        context_used = {},
        follow_up_queries = [],
        iteration_summary = {}
    } = ragDetails;

    const handleToggle = () => {
        setExpanded(!expanded);
        if (onToggle) onToggle(!expanded);
    };

    const getIterationStatus = (current, max) => {
        if (current === 0) return { status: 'not_started', color: 'default' };
        if (current < max) return { status: 'in_progress', color: 'primary' };
        return { status: 'completed', color: 'success' };
    };

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'high': return theme.palette.success.main;
            case 'medium': return theme.palette.warning.main;
            case 'low': return theme.palette.error.main;
            default: return theme.palette.grey[500];
        }
    };

    const getConfidenceIcon = (level) => {
        switch (level) {
            case 'high': return <CheckCircle size={16} />;
            case 'medium': return <Warning size={16} />;
            case 'low': return <Info size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const iterationStatus = getIterationStatus(iterations, max_iterations);
    const progressPercentage = (iterations / max_iterations) * 100;

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.background.paper, 0.5)
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                }}
                onClick={handleToggle}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Brain size={18} color={theme.palette.primary.main} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        AI Thinking Process
                    </Typography>
                    <Chip
                        label={`${iterations}/${max_iterations} iterations`}
                        size="small"
                        color={iterationStatus.color}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                </Box>
                <IconButton size="small">
                    {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                </IconButton>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ px: 1.5, py: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                        Context Analysis Progress
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {Math.round(progressPercentage)}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progressPercentage}
                    sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.grey[300], 0.3),
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            bgcolor: iterationStatus.status === 'completed' 
                                ? theme.palette.success.main 
                                : theme.palette.primary.main
                        }
                    }}
                />
            </Box>

            {/* Expanded Content */}
            <Collapse in={expanded}>
                <Box sx={{ p: 1.5 }}>
                    {/* Iteration Details */}
                    <Box mb={2}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Context Retrieval Details
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            <Chip
                                icon={<Database size={14} />}
                                label={`${context_used.initial_docs_count || 0} initial docs`}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                icon={<MagnifyingGlass size={14} />}
                                label={`${follow_up_queries.length} follow-up queries`}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                icon={<Brain size={14} />}
                                label={`${context_used.total_context_length || 0} chars context`}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    {/* Follow-up Queries - Only show when not completed */}
                    {follow_up_queries.length > 0 && !isCompleted && (
                        <Box mb={2}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Follow-up Queries Generated
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={0.5}>
                                {follow_up_queries.map((query, index) => (
                                    <Paper
                                        key={index}
                                        elevation={0}
                                        sx={{
                                            p: 1,
                                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                            borderRadius: 1
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Query {index + 1}:
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            {query}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Iteration Summary */}
                    {iteration_summary && Object.keys(iteration_summary).length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Process Summary
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        Iterations Used:
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {iteration_summary.total_iterations_performed || 0} / {iteration_summary.max_iterations_allowed || 4}
                                    </Typography>
                                </Box>
                                
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        Context Growth:
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {iteration_summary.context_enhancement?.context_growth_factor || 1}x
                                    </Typography>
                                </Box>
                                
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        Process Status:
                                    </Typography>
                                    <Chip
                                        label={iteration_summary.process_status || 'unknown'}
                                        size="small"
                                        color={iteration_summary.process_status === 'completed' ? 'success' : 'default'}
                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Efficiency Metrics */}
                    {iteration_summary?.efficiency_metrics && (
                        <Box mt={2}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Efficiency Metrics
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                <Tooltip title="Documents retrieved per follow-up query">
                                    <Chip
                                        label={`${iteration_summary.efficiency_metrics.documents_per_query || 0} docs/query`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                </Tooltip>
                                <Tooltip title="Context utilization efficiency">
                                    <Chip
                                        label={iteration_summary.efficiency_metrics.context_utilization || 'unknown'}
                                        size="small"
                                        variant="outlined"
                                        color={iteration_summary.efficiency_metrics.context_utilization === 'high' ? 'success' : 'default'}
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                </Tooltip>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
    } catch (error) {
        console.error('Error in ChainOfThought component:', error);
        return (
            <Paper
                elevation={0}
                sx={{
                    mt: 1,
                    p: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.05)
                }}
            >
                <Typography variant="body2" color="error.main">
                    Error displaying thinking process
                </Typography>
            </Paper>
        );
    }
};

export default ChainOfThought;
