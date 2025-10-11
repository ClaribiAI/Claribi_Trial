import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Paper,
    Divider,
    Alert,
    useTheme,
    alpha
} from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import {
    Question,
    CheckCircle,
    XCircle,
    PaperPlaneRight
} from '@phosphor-icons/react';

const ClarificationDialog = ({ 
    open, 
    onClose, 
    clarifications, 
    onSubmit, 
    isLoading = false 
}) => {
    const theme = useTheme();
    const [answers, setAnswers] = useState({});
    const [errors, setErrors] = useState({});

    // Reset answers when dialog opens/closes
    React.useEffect(() => {
        if (open) {
            setAnswers({});
            setErrors({});
        }
    }, [open, clarifications]);

    const handleAnswerChange = (index, value) => {
        setAnswers(prev => ({
            ...prev,
            [index]: value
        }));
        
        // Clear error when user starts typing
        if (errors[index]) {
            setErrors(prev => ({
                ...prev,
                [index]: ''
            }));
        }
    };

    const validateAnswers = () => {
        const newErrors = {};
        let isValid = true;

        clarifications.forEach((_, index) => {
            if (!answers[index] || answers[index].trim() === '') {
                newErrors[index] = 'Please provide an answer to this question';
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = () => {
        if (validateAnswers()) {
            onSubmit(answers);
        }
    };

    const handleCancel = () => {
        setAnswers({});
        setErrors({});
        onClose();
    };

    if (!open) return null;

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[20],
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    pb: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        color: 'white'
                    }}
                >
                    <Question size={20} />
                </Box>
                <Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        Clarification Needed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please provide additional details to help generate a better response
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Alert 
                    severity="info" 
                    sx={{ 
                        mb: 3,
                        borderRadius: 2,
                        '& .MuiAlert-icon': {
                            color: theme.palette.primary.main
                        }
                    }}
                >
                    <Typography variant="body2">
                        To provide you with the most accurate response, I need some clarification on your request. 
                        Please answer the following questions:
                    </Typography>
                </Alert>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {clarifications.map((question, index) => (
                        <Paper
                            key={index}
                            elevation={0}
                            sx={{
                                p: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 2,
                                backgroundColor: theme.palette.background.paper,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        flexShrink: 0,
                                        mt: 0.5
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {index + 1}
                                    </Typography>
                                </Box>
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        fontWeight: 500,
                                        color: theme.palette.text.primary,
                                        lineHeight: 1.5
                                    }}
                                >
                                    {question}
                                </Typography>
                            </Box>
                            
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={answers[index] || ''}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                placeholder="Please provide your answer here..."
                                error={!!errors[index]}
                                helperText={errors[index]}
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: theme.palette.primary.main
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: theme.palette.primary.main,
                                            borderWidth: 2
                                        }
                                    }
                                }}
                            />
                        </Paper>
                    ))}
                </Box>
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 3, gap: 2 }}>
                <Button
                    onClick={handleCancel}
                    disabled={isLoading}
                    variant="outlined"
                    startIcon={<XCircle size={16} />}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 3,
                        py: 1
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    variant="contained"
                    startIcon={isLoading ? <LoadingSpinner size={16} compact /> : <PaperPlaneRight size={16} />}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 3,
                        py: 1,
                        minWidth: 120
                    }}
                >
                    {isLoading ? 'Processing...' : 'Submit Answers'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ClarificationDialog;
