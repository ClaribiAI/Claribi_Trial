import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    alpha,
    useTheme
} from '@mui/material';
import {
    Warning,
    Trash,
    X
} from '@phosphor-icons/react';

const ConfirmationDialog = ({ 
    open, 
    onClose, 
    onConfirm, 
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning", // "warning", "danger", "info"
    isLoading = false
}) => {
    const theme = useTheme();

    const getIconAndColor = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <Trash size={24} />,
                    color: theme.palette.error.main,
                    bgColor: alpha(theme.palette.error.main, 0.1)
                };
            case 'info':
                return {
                    icon: <Warning size={24} />,
                    color: theme.palette.info.main,
                    bgColor: alpha(theme.palette.info.main, 0.1)
                };
            default: // warning
                return {
                    icon: <Warning size={24} />,
                    color: theme.palette.warning.main,
                    bgColor: alpha(theme.palette.warning.main, 0.1)
                };
        }
    };

    const { icon, color, bgColor } = getIconAndColor();

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 24px 48px rgba(0,0,0,0.4)' 
                        : '0 24px 48px rgba(0,0,0,0.15)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }
            }}
        >
            <DialogTitle sx={{ pb: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: bgColor,
                            color: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {icon}
                    </Box>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                            fontSize: '1.25rem',
                            letterSpacing: '-0.025em'
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 1, pb: 2 }}>
                <Typography 
                    variant="body1" 
                    sx={{ 
                        color: theme.palette.text.secondary,
                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        fontWeight: 400
                    }}
                >
                    {message}
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
                <Button
                    onClick={handleCancel}
                    disabled={isLoading}
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
                        minWidth: 100,
                        '&:hover': {
                            borderColor: alpha(theme.palette.divider, 0.5),
                            bgcolor: alpha(theme.palette.background.default, 0.5),
                            transform: 'translateY(-1px)',
                            boxShadow: theme.palette.mode === 'dark' 
                                ? '0 4px 12px rgba(0,0,0,0.3)' 
                                : '0 4px 12px rgba(0,0,0,0.1)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    variant="contained"
                    sx={{
                        borderRadius: 2.5,
                        px: 4,
                        py: 1.5,
                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        minWidth: 100,
                        bgcolor: type === 'danger' ? theme.palette.error.main : theme.palette.primary.main,
                        color: type === 'danger' ? theme.palette.error.contrastText : theme.palette.primary.contrastText,
                        '&:hover': {
                            bgcolor: type === 'danger' ? theme.palette.error.dark : theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                            boxShadow: theme.palette.mode === 'dark' 
                                ? '0 6px 20px rgba(0,0,0,0.4)' 
                                : '0 6px 20px rgba(0,0,0,0.15)'
                        },
                        '&:disabled': {
                            bgcolor: alpha(type === 'danger' ? theme.palette.error.main : theme.palette.primary.main, 0.3),
                            transform: 'none',
                            boxShadow: 'none'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isLoading ? 'Processing...' : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
