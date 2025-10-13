import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    LinearProgress,
    Chip,
    useTheme,
    alpha,
    Fade,
    Collapse,
    IconButton
} from '@mui/material';
import {
    Brain,
    CheckCircle,
    CaretDown,
    CaretRight,
    Database,
    MagnifyingGlass
} from '@phosphor-icons/react';

const ThinkingProcess = React.memo(({ 
    isVisible = false, 
    currentAction = '',
    followUpQueries = [],
    clearHistory = false,
    onToggle = null,
    isCompleted = false,
    ragDetails = null,
    actionHistory = []
}) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => {
        setExpanded(!expanded);
        if (onToggle) onToggle(!expanded);
    };


    if (!isVisible) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.primary.main, 0.02)
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
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
                        label={isCompleted ? 'Completed' : 'Processing'}
                        size="small"
                        color={isCompleted ? 'success' : 'primary'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                </Box>
                <IconButton size="small">
                    {expanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                </IconButton>
            </Box>


            {/* Expanded Content */}
            <Collapse in={expanded}>
                <Box sx={{ p: 1.5 }}>
                    {/* Context Retrieval Details */}
                    {ragDetails && (
                        <Box mb={2}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Context Retrieval Details
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                                <Chip
                                    icon={<Database size={14} />}
                                    label={`${ragDetails.context_used?.initial_docs_count || 0} initial docs`}
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip
                                    icon={<MagnifyingGlass size={14} />}
                                    label={`${ragDetails.follow_up_queries?.length || 0} follow-up queries`}
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip
                                    icon={<Brain size={14} />}
                                    label={`${ragDetails.context_used?.total_context_length || 0} chars context`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        </Box>
                    )}

                    {/* Current Action */}
                    {currentAction && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                Current Action:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                {currentAction}
                            </Typography>
                        </Box>
                    )}



                    {/* Action History - Always show if there's history */}
                    {actionHistory.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Processing Steps:
                            </Typography>
                            {console.log('Rendering action history in ThinkingProcess:', actionHistory)}
                            <Box display="flex" flexDirection="column" gap={0.5}>
                                {actionHistory.map((action, index) => (
                                    <Fade key={action.id} in={true} timeout={300}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 1,
                                                bgcolor: action.status === 'completed' 
                                                    ? alpha(theme.palette.success.main, 0.12)
                                                    : alpha(theme.palette.primary.main, 0.05),
                                                border: `1px solid ${action.status === 'completed' 
                                                    ? alpha(theme.palette.success.main, 0.2)
                                                    : alpha(theme.palette.primary.main, 0.2)}`
                                            }}
                                        >
                                            {/* Icon indicator */}
                                            <Box
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    bgcolor: action.status === 'completed' 
                                                        ? theme.palette.success.main
                                                        : theme.palette.primary.main,
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    flexShrink: 0,
                                                    mt: 0.25
                                                }}
                                            >
                                                {action.type === 'search' ? (
                                                    <MagnifyingGlass size={12} />
                                                ) : action.status === 'completed' ? (
                                                    '✓'
                                                ) : (
                                                    <Brain size={12} />
                                                )}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontSize: '0.85rem', 
                                                        lineHeight: 1.4, 
                                                        fontWeight: action.status === 'completed' ? 400 : 500,
                                                        fontStyle: action.type === 'search' ? 'italic' : 'normal'
                                                    }}
                                                >
                                                    {action.action}
                                                </Typography>
                                                {action.type === 'search' && action.searchQuery && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ 
                                                        fontSize: '0.7rem', 
                                                        fontStyle: 'italic',
                                                        display: 'block',
                                                        mt: 0.25,
                                                        opacity: 0.8
                                                    }}>
                                                        Query: "{action.searchQuery}"
                                                    </Typography>
                                                )}
                                                {action.type === 'search' && action.resultCount !== undefined && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ 
                                                        fontSize: '0.7rem', 
                                                        display: 'block',
                                                        mt: 0.25,
                                                        opacity: 0.9,
                                                        fontWeight: 500
                                                    }}>
                                                        {action.resultCount} result{action.resultCount !== 1 ? 's' : ''} found
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                    {action.timestamp}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Fade>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>

        </Paper>
    );
});

export default ThinkingProcess;
