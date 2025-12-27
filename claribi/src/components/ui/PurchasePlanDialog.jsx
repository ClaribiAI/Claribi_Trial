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
    useTheme,
    Link
} from '@mui/material';
import {
    Warning
} from '@phosphor-icons/react';

const PurchasePlanDialog = ({ 
    open, 
    onClose,
    title = "Upload Limit Reached",
    message = "You have already uploaded a file. To upload more files, please purchase a plan by visiting"
}) => {
    const theme = useTheme();

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
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            color: theme.palette.warning.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Warning size={24} />
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
                        fontWeight: 400,
                        mb: 2
                    }}
                >
                    {message}{' '}
                    <Link 
                        href="https://www.claribi.ai/claribi-console" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        sx={{
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            textDecoration: 'none',
                            '&:hover': {
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        www.claribi.ai/claribi-console
                    </Link>
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
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
                        minWidth: 100,
                        borderColor: theme.palette.text.primary,
                        color: theme.palette.text.primary,
                        '&:hover': {
                            borderColor: theme.palette.text.primary,
                            bgcolor: alpha(theme.palette.text.primary, 0.08),
                            transform: 'translateY(-1px)',
                            boxShadow: theme.palette.mode === 'dark' 
                                ? '0 6px 20px rgba(0,0,0,0.4)' 
                                : '0 6px 20px rgba(0,0,0,0.15)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    Close
                </Button>
                <Button
                    component="a"
                    href="https://www.claribi.ai/claribi-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    sx={{
                        borderRadius: 2.5,
                        px: 4,
                        py: 1.5,
                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        color: theme.palette.primary.contrastText,
                        minWidth: 100,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                            boxShadow: theme.palette.mode === 'dark' 
                                ? '0 4px 12px rgba(0,0,0,0.3)' 
                                : '0 4px 12px rgba(0,0,0,0.1)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    Purchase a Plan
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PurchasePlanDialog;

