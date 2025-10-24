import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    TextField,
    Button,
    useTheme,
    alpha
} from '@mui/material';
import {
    PaperPlaneRight
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
        
        onSendMessage(message);
        setInputMessage('');
    }, [inputMessage, isLoading, disabled, onSendMessage]);

    const handleInputChange = useCallback((e) => {
        setInputMessage(e.target.value);
    }, []);

    return (
        <Box sx={{ position: 'relative' }}>
            <TextField
                ref={inputRef}
                fullWidth
                multiline
                maxRows={4}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                variant="outlined"
                disabled={isLoading || disabled}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: theme.palette.background.chat,
                        border: `1px solid ${theme.palette.input.border}`,
                        color: theme.palette.text.primary,
                        pr: inputMessage.trim() ? 7 : 2, // Add right padding when button is visible
                        '&:hover': { 
                            bgcolor: theme.palette.background.chat,
                            borderColor: alpha(theme.palette.input.focusBorder, 0.3)
                        },
                        '&.Mui-focused': { 
                            bgcolor: theme.palette.background.chat,
                            borderColor: theme.palette.input.focusBorder,
                            boxShadow: `0 0 0 2px ${alpha(theme.palette.input.focusBorder, 0.1)}`
                        }
                    },
                    '& .MuiInputBase-input': {
                        color: theme.palette.text.primary
                    },
                    '& .MuiInputBase-input::placeholder': {
                        color: theme.palette.text.secondary,
                        opacity: 1
                    }
                }}
            />
            {inputMessage.trim() && (
                <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || disabled}
                    variant="contained"
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        minWidth: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: theme.palette.primary.main,
                        '&:hover': { 
                            bgcolor: theme.palette.primary.dark,
                            transform: 'translateY(-50%) scale(1.05)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        },
                        '&:disabled': { 
                            bgcolor: alpha(theme.palette.primary.main, 0.3),
                            transform: 'translateY(-50%)',
                            boxShadow: 'none'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isLoading ? (
                        <LoadingSpinner size={16} compact />
                    ) : (
                        <PaperPlaneRight size={16} />
                    )}
                </Button>
            )}
        </Box>
    );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
