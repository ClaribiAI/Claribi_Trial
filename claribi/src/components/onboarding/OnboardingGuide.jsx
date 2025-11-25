import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    useTheme,
    alpha,
    IconButton
} from '@mui/material';
import {
    CloudArrowUp,
    FileText,
    ChatCircle,
    Stethoscope,
    X
} from '@phosphor-icons/react';

const OnboardingGuide = ({ open, onClose, onDismiss }) => {
    const theme = useTheme();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'Upload Your Power BI File',
            description: 'Start by uploading your Power BI (.pbix) file. Click the "Upload New" button to select and upload your file. Once uploaded, your file will be analyzed and ready for use.',
            icon: CloudArrowUp,
            gifPlaceholder: 'GIF placeholder - Upload file'
        },
        {
            title: 'Generate Documentation',
            description: 'Create comprehensive documentation for your Power BI dataset. Get detailed insights on data models, relationships, security settings, and best practice recommendations.',
            icon: FileText,
            gifPlaceholder: 'GIF placeholder - Generate documentation'
        },
        {
            title: 'Chat with Your Data',
            description: 'Have real-time conversations with your Power BI dataset. Ask questions, get insights, and receive instant answers about your data. Simply select a file and start chatting.',
            icon: ChatCircle,
            gifPlaceholder: 'GIF placeholder - Chat with Power BI'
        },
        {
            title: 'Run Diagnostics',
            description: 'Get actionable improvement recommendations for your Power BI file. Identify performance issues, optimization opportunities, and areas for enhancement.',
            icon: Stethoscope,
            gifPlaceholder: 'GIF placeholder - Run diagnostics'
        }
    ];

    const currentStepData = steps[currentStep];
    const IconComponent = currentStepData.icon;
    const isLastStep = currentStep === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss();
        }
        onClose();
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 24px 48px rgba(0,0,0,0.4)' 
                        : '0 24px 48px rgba(0,0,0,0.15)',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{ 
                pb: 2,
                pt: 3.5,
                px: 4,
                fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                fontWeight: 600, 
                fontSize: '1.5rem',
                letterSpacing: '-0.025em',
                color: theme.palette.text.primary,
                position: 'relative',
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5" sx={{ 
                        fontWeight: 600,
                        fontSize: '1.5rem',
                        letterSpacing: '-0.025em'
                    }}>
                        Welcome to Claribi Console
                    </Typography>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: theme.palette.text.secondary,
                            width: 32,
                            height: 32,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.background.hover, 0.5),
                                color: theme.palette.text.primary
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <X size={18} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ 
                px: 4, 
                pb: 3,
                pt: 3,
                minHeight: '520px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 3,
                    width: '100%',
                    maxWidth: '600px',
                    mx: 'auto'
                }}>
                    {/* Icon */}
                    <Box
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 80,
                            height: 80,
                            flexShrink: 0
                        }}
                    >
                        <IconComponent size={40} weight="duotone" />
                    </Box>

                    {/* Title and Description Container */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0,
                        width: '100%'
                    }}>
                        {/* Title */}
                        <Typography variant="h5" sx={{ 
                            fontWeight: 600,
                            textAlign: 'center',
                            color: theme.palette.text.primary,
                            fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                            fontSize: '1.5rem',
                            letterSpacing: '-0.025em',
                            lineHeight: 1.3,
                            mb: 0
                        }}>
                            {currentStepData.title}
                        </Typography>

                        {/* Description */}
                        <Typography variant="body1" sx={{ 
                            textAlign: 'center',
                            color: theme.palette.text.secondary,
                            lineHeight: 1.7,
                            fontSize: '1rem',
                            fontFamily: "'Nunito Sans', sans-serif",
                            maxWidth: '100%',
                            minHeight: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {currentStepData.description}
                        </Typography>
                    </Box>

                    {/* GIF Placeholder */}
                    <Box
                        sx={{
                            width: '100%',
                            height: '320px',
                            borderRadius: 3,
                            bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.background.paper, 0.5)
                                : alpha(theme.palette.background.chat, 0.6),
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: theme.palette.mode === 'dark'
                                ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                : 'inset 0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Box sx={{
                            textAlign: 'center',
                            px: 3
                        }}>
                            <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontStyle: 'italic',
                                fontFamily: "'Nunito Sans', sans-serif",
                                fontSize: '0.875rem',
                                opacity: 0.7
                            }}>
                                {currentStepData.gifPlaceholder}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ 
                px: 4, 
                pb: 3.5, 
                pt: 3,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}>
                {/* Left side - Don't show again */}
                <Button
                    onClick={handleDismiss}
                    sx={{
                        color: theme.palette.text.secondary,
                        textTransform: 'none',
                        fontFamily: "'Nunito Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        px: 2,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.hover, 0.5),
                            color: theme.palette.text.primary
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    Don't show again
                </Button>

                {/* Right side - Navigation buttons */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {currentStep > 0 && (
                        <Button
                            onClick={handleBack}
                            variant="outlined"
                            sx={{
                                borderRadius: 2.5,
                                px: 3,
                                py: 1.25,
                                fontFamily: "'Nunito Sans', sans-serif",
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                textTransform: 'none',
                                borderColor: alpha(theme.palette.divider, 0.3),
                                color: theme.palette.text.primary,
                                '&:hover': {
                                    borderColor: alpha(theme.palette.divider, 0.5),
                                    bgcolor: alpha(theme.palette.background.chat, 0.5)
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        onClick={handleSkip}
                        variant="outlined"
                        sx={{
                            borderRadius: 2.5,
                            px: 3,
                            py: 1.25,
                            fontFamily: "'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textTransform: 'none',
                            borderColor: alpha(theme.palette.divider, 0.3),
                            color: theme.palette.text.primary,
                            '&:hover': {
                                borderColor: alpha(theme.palette.divider, 0.5),
                                bgcolor: alpha(theme.palette.background.chat, 0.5)
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Skip
                    </Button>
                    <Button
                        onClick={handleNext}
                        variant="contained"
                        sx={{
                            borderRadius: 2.5,
                            px: 4,
                            py: 1.25,
                            fontFamily: "'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textTransform: 'none',
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isLastStep ? 'Finish' : 'Next'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default OnboardingGuide;

