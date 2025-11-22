import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    useTheme,
    alpha
} from '@mui/material';
import {
    ChatCircle,
    FileText,
    Stethoscope
} from '@phosphor-icons/react';

const FileActionSelectionDialog = ({ 
    open, 
    onClose, 
    selectedFile, 
    onChatClick, 
    onDocsClick, 
    onDiagnosticsClick 
}) => {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            sx={{ zIndex: 1300 }}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 24px 48px rgba(0,0,0,0.4)' 
                        : '0 24px 48px rgba(0,0,0,0.15)',
                    zIndex: 1300
                }
            }}
        >
            <DialogTitle sx={{ 
                pb: 2,
                fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                fontWeight: 600, 
                fontSize: '1.5rem',
                letterSpacing: '-0.025em',
                color: theme.palette.text.primary,
                textAlign: 'center'
            }}>
                Select Action for {selectedFile?.filename || 'File'}
            </DialogTitle>
            <DialogContent sx={{ pt: 1, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, flexWrap: 'wrap' }}>
                    {/* Chat Option */}
                    <Button
                        onClick={onChatClick}
                        variant="outlined"
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 3,
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '1rem',
                            textTransform: 'none',
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            color: theme.palette.primary.main,
                            bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.background.paper, 0.8)
                                : alpha(theme.palette.primary.main, 0.05),
                            height: 'auto',
                            minHeight: 80,
                            flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 16px)' },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.paper, 0.9)
                                    : alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateY(-2px)',
                                boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 8px 24px rgba(0,0,0,0.3)' 
                                    : '0 8px 24px rgba(0,0,0,0.1)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                            <ChatCircle size={24} color="currentColor" />
                            <Typography variant="h6" sx={{ 
                                fontWeight: 600,
                                fontSize: '1.125rem',
                                color: 'inherit',
                                whiteSpace: 'nowrap'
                            }}>
                                Interactive Chat
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ 
                            color: theme.palette.text.secondary, 
                            fontSize: '0.875rem',
                            lineHeight: 1.5,
                            textAlign: 'center'
                        }}>
                            Have real-time conversations with your data. Ask questions, get insights, and receive instant answers about your Power BI dataset.
                        </Typography>
                    </Button>
                        
                    {/* Docs Option */}
                    <Button
                        onClick={onDocsClick}
                        variant="outlined"
                        sx={{ 
                            borderRadius: 3,
                            px: 4,
                            py: 3,
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '1rem',
                            textTransform: 'none',
                            borderColor: alpha(theme.palette.secondary.main, 0.3),
                            color: theme.palette.secondary.main,
                            bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.background.paper, 0.8)
                                : alpha(theme.palette.secondary.main, 0.05),
                            height: 'auto',
                            minHeight: 80,
                            flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 16px)' },
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            textAlign: 'center',
                            '&:hover': {
                                borderColor: theme.palette.secondary.main,
                                bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.paper, 0.9)
                                    : alpha(theme.palette.secondary.main, 0.1),
                                transform: 'translateY(-2px)',
                                boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 8px 24px rgba(0,0,0,0.3)' 
                                    : '0 8px 24px rgba(0,0,0,0.1)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                            <FileText size={24} color="currentColor" />
                            <Typography variant="h6" sx={{ 
                                fontWeight: 600,
                                fontSize: '1.125rem',
                                color: 'inherit',
                                whiteSpace: 'nowrap'
                            }}>
                                Generate Documentation
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ 
                            color: theme.palette.text.secondary,
                            fontSize: '0.875rem',
                            lineHeight: 1.5,
                            textAlign: 'center'
                        }}>
                            Create comprehensive documentation and analysis reports. Get detailed insights on data models, security, and recommendations.
                        </Typography>
                    </Button>

                    {/* Diagnostics Option */}
                    <Button
                        onClick={onDiagnosticsClick}
                        variant="outlined"
                        sx={{ 
                            borderRadius: 3,
                            px: 4,
                            py: 3,
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '1rem',
                            textTransform: 'none',
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            color: theme.palette.primary.main,
                            bgcolor: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.background.paper, 0.8)
                                : alpha(theme.palette.primary.main, 0.05),
                            height: 'auto',
                            minHeight: 80,
                            flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 16px)' },
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            textAlign: 'center',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.paper, 0.9)
                                    : alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateY(-2px)',
                                boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 8px 24px rgba(0,0,0,0.3)' 
                                    : '0 8px 24px rgba(0,0,0,0.1)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
                            <Stethoscope size={24} color="currentColor" />
                            <Typography variant="h6" sx={{ 
                                fontWeight: 600,
                                fontSize: '1.125rem',
                                color: 'inherit',
                                whiteSpace: 'nowrap'
                            }}>
                                Run Diagnostics
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ 
                            color: theme.palette.text.secondary,
                            fontSize: '0.875rem',
                            lineHeight: 1.5,
                            textAlign: 'center'
                        }}>
                            Get actionable improvement recommendations for performance, optimization, and best practices. Identify areas for enhancement.
                        </Typography>
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        borderRadius: 2.5,
                        px: 4,
                        py: 1.5,
                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        borderColor: alpha(theme.palette.divider, 0.3),
                        color: theme.palette.text.primary,
                        '&:hover': {
                            borderColor: alpha(theme.palette.divider, 0.5),
                            bgcolor: alpha(theme.palette.background.chat, 0.5)
                        }
                    }}
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FileActionSelectionDialog;

