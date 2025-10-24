import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    TextField,
    Button,
    useTheme,
    alpha
} from '@mui/material';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ClarificationInput = React.memo(({ 
    onSendAnswer, 
    isProcessing, 
    currentQuestionNumber,
    totalQuestions,
    disabled = false 
}) => {
    const theme = useTheme();
    const [answer, setAnswer] = useState('');

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSendAnswer();
        }
    }, [answer]);

    const handleSendAnswer = useCallback(() => {
        const trimmedAnswer = answer.trim();
        if (!trimmedAnswer || isProcessing || disabled) return;
        
        onSendAnswer(trimmedAnswer);
        setAnswer('');
    }, [answer, isProcessing, disabled, onSendAnswer]);

    const handleInputChange = useCallback((e) => {
        setAnswer(e.target.value);
    }, []);

    const buttonText = currentQuestionNumber === totalQuestions ? 'Submit' : 'Next';

    return (
        <Box sx={{ position: 'relative' }}>
            <TextField
                fullWidth
                multiline
                maxRows={4}
                value={answer}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Answer: Question ${currentQuestionNumber}/${totalQuestions}`}
                variant="outlined"
                disabled={isProcessing || disabled}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: theme.palette.background.chat,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        color: theme.palette.text.primary,
                        pr: answer.trim() ? 7 : 2, // Add right padding when button is visible
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
            {answer.trim() && (
                <Button
                    onClick={handleSendAnswer}
                    disabled={isProcessing || disabled}
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
                    {isProcessing ? (
                        <LoadingSpinner size={16} compact />
                    ) : (
                        buttonText
                    )}
                </Button>
            )}
        </Box>
    );
});

ClarificationInput.displayName = 'ClarificationInput';

export default ClarificationInput;
