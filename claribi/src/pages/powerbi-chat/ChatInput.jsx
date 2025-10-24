import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    TextField,
    Button,
    useTheme,
    alpha,
    ToggleButtonGroup,
    ToggleButton,
    Typography
} from '@mui/material';
import {
    PaperPlaneRight,
    Info,
    Lightning
} from '@phosphor-icons/react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ChatInput = React.memo(({ 
    onSendMessage, 
    isLoading, 
    placeholder = "Ask me anything about your Power BI dataset...",
    disabled = false 
}) => {
    const theme = useTheme();
    const [inputMessage, setInputMessage] = useState('');
    const [responseMode, setResponseMode] = useState('detailed');
    const inputRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage();
        }
    }, [inputMessage]);

    const handleSendMessage = useCallback(() => {
        const message = inputMessage.trim();
        if (!message || isLoading || disabled) return;
        
        onSendMessage(message, responseMode);
        setInputMessage('');
    }, [inputMessage, isLoading, disabled, onSendMessage, responseMode]);

    const handleInputChange = useCallback((e) => {
        setInputMessage(e.target.value);
    }, []);

    const handleResponseModeChange = useCallback((event, newMode) => {
        if (newMode !== null) {
            setResponseMode(newMode);
        }
    }, []);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 1,
            bgcolor: theme.palette.background.chat,
            borderRadius: 3,
            border: `1px solid ${theme.palette.input.border}`,
            p: 2,
            '&:hover': {
                borderColor: alpha(theme.palette.input.focusBorder, 0.3)
            },
            '&:focus-within': {
                borderColor: theme.palette.input.focusBorder,
                boxShadow: `0 0 0 2px ${alpha(theme.palette.input.focusBorder, 0.1)}`
            }
        }}>
            {/* Text Input Area - 2 lines */}
            <TextField
                ref={inputRef}
                fullWidth
                multiline
                rows={2}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                variant="standard"
                disabled={isLoading || disabled}
                sx={{
                    '& .MuiInput-root': {
                        '&:before': {
                            borderBottom: 'none !important'
                        },
                        '&:after': {
                            borderBottom: 'none !important'
                        },
                        '&:hover:not(.Mui-disabled):before': {
                            borderBottom: 'none !important'
                        },
                        '&:hover:not(.Mui-disabled):after': {
                            borderBottom: 'none !important'
                        },
                        '&.Mui-focused:before': {
                            borderBottom: 'none !important'
                        },
                        '&.Mui-focused:after': {
                            borderBottom: 'none !important'
                        }
                    },
                    '& .MuiInputBase-input': {
                        color: theme.palette.text.primary,
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        padding: 0,
                        '&::placeholder': {
                            color: theme.palette.text.secondary,
                            opacity: 1
                        }
                    },
                    '& .MuiInputBase-inputMultiline': {
                        '&::placeholder': {
                            color: theme.palette.text.secondary,
                            opacity: 1
                        }
                    }
                }}
            />
            
            {/* Bottom Row - Controls */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 1,
                minHeight: 30
            }}>
                {/* Response Mode Toggle */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    px: 1.5,
                    py: 0,
                    height: 30,
                    minWidth: 140,
                    opacity: isLoading ? 0.5 : 1,
                    pointerEvents: isLoading ? 'none' : 'auto',
                    cursor: isLoading ? 'not-allowed' : 'default'
                }}>
                    {/* Detailed Text */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4,
                        color: responseMode === 'detailed' ? theme.palette.primary.main : theme.palette.text.secondary,
                        transition: 'color 0.2s ease',
                        opacity: 0.9,
                        ...theme.typography.caption
                    }}>
                        <Info size={10} />
                        Detailed
                    </Box>

                    {/* Slider Switch */}
                    <Box sx={{
                        position: 'relative',
                        width: 32,
                        height: 16,
                        bgcolor: responseMode === 'detailed' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.text.secondary, 0.2),
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: responseMode === 'detailed' ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.text.secondary, 0.3),
                        }
                    }}
                    onClick={() => setResponseMode(responseMode === 'detailed' ? 'concise' : 'detailed')}
                    >
                        {/* Sliding Circle */}
                        <Box sx={{
                            position: 'absolute',
                            top: 1,
                            left: responseMode === 'detailed' ? 1 : 15,
                            width: 14,
                            height: 14,
                            bgcolor: responseMode === 'detailed' ? theme.palette.primary.main : theme.palette.text.secondary,
                            borderRadius: '50%',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                    </Box>

                    {/* Concise Text */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4,
                        color: responseMode === 'concise' ? theme.palette.primary.main : theme.palette.text.secondary,
                        transition: 'color 0.2s ease',
                        opacity: 0.9,
                        ...theme.typography.caption
                    }}>
                        <Lightning size={10} />
                        Concise
                    </Box>
                </Box>

                {/* Send Button */}
                <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || disabled || !inputMessage.trim()}
                    variant="contained"
                    sx={{
                        minWidth: 30,
                        height: 30,
                        borderRadius: 2,
                        bgcolor: inputMessage.trim() ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.3),
                        color: inputMessage.trim() ? theme.palette.primary.contrastText : theme.palette.text.disabled,
                        '&:hover': inputMessage.trim() ? { 
                            bgcolor: theme.palette.primary.dark,
                            transform: 'scale(1.05)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        } : {
                            bgcolor: alpha(theme.palette.text.secondary, 0.4),
                            transform: 'none',
                            boxShadow: 'none'
                        },
                        '&:disabled': { 
                            bgcolor: alpha(theme.palette.text.secondary, 0.3),
                            color: theme.palette.text.disabled,
                            transform: 'none',
                            boxShadow: 'none'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isLoading ? (
                        <LoadingSpinner size={14} compact />
                    ) : (
                        <PaperPlaneRight size={14} />
                    )}
                </Button>
            </Box>
        </Box>
    );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
