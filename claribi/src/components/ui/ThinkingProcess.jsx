import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    useTheme,
    alpha,
    Collapse,
    IconButton
} from '@mui/material';
import {
    Brain,
    CheckCircle,
    CaretDown,
    CaretRight
} from '@phosphor-icons/react';

const ThinkingProcess = React.memo(({ 
    isVisible = false, 
    currentAction = '',
    onToggle = null,
    isCompleted = false,
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
                <Box sx={{ p: 1.5, pt: 0 }}>
                    {/* Current Action */}
                    {currentAction && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                Current Action:
                            </Typography>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                {currentAction}
                            </Typography>
                        </Box>
                    )}

                    {/* Action History */}
                    {actionHistory.length > 0 && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Processing Steps:
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={0.5}>
                                {actionHistory.map((action, index) => {
                                    // Check if action is completed - handle different status values
                                    // For regular steps, consider them completed if:
                                    // 1. They have status 'completed', 'done', or 'finished'
                                    // 2. They are search steps with resultCount (completed search)
                                    // 3. They are regular steps that are not the current action (meaning they're done)
                                    // 4. They are regular steps that are not the last action in the list (meaning they're done)
                                    const isCompleted = action.status === 'completed' || 
                                                       action.status === 'done' || 
                                                       action.status === 'finished' ||
                                                       (action.type === 'search' && action.resultCount !== undefined) ||
                                                       (action.type === 'regular' && action.action !== currentAction) ||
                                                       (action.type === 'regular' && index < actionHistory.length - 1);
                                    
                                    return (
                                        <Box
                                            key={action.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 1,
                                                bgcolor: isCompleted 
                                                    ? alpha(theme.palette.success.main, 0.08)
                                                    : alpha(theme.palette.primary.main, 0.05),
                                                border: `1px solid ${isCompleted 
                                                    ? alpha(theme.palette.success.main, 0.15)
                                                    : alpha(theme.palette.primary.main, 0.15)}`
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    bgcolor: isCompleted 
                                                        ? theme.palette.success.main
                                                        : theme.palette.primary.main,
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.6rem',
                                                    flexShrink: 0,
                                                    mt: 0.25
                                                }}
                                            >
                                                {isCompleted ? '✓' : '○'}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        fontSize: '0.8rem', 
                                                        lineHeight: 1.4,
                                                        color: 'text.primary'
                                                    }}
                                                >
                                                    {action.action}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
});

export default ThinkingProcess;
