import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    useTheme
} from '@mui/material';
import {
    ArrowClockwiseIcon,
    SparkleIcon
} from '@phosphor-icons/react';

// Enhanced Custom Instructions Modal
const CustomInstructionsModal = ({ 
    showModal, 
    onClose, 
    currentSection, 
    customInstructions, 
    setCustomInstructions, 
    onRegenerate, 
    isLoading
}) => {
    const theme = useTheme();
    
    return (
        <Dialog 
            open={showModal} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[20]
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <ArrowClockwiseIcon size={20} color="currentColor" style={{ color: '#1976d2' }} />
                    <Typography variant="h6" component="span">
                        Regenerate {currentSection?.title}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Provide specific instructions on how you'd like to modify this section. For example: 
                    "Focus more on security best practices" or "Include specific metrics and KPIs".
                </Typography>
                <TextField
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter your custom instructions here... (optional)"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button 
                    onClick={onClose} 
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
                    sx={{ 
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        borderRadius: 2, 
                        minWidth: 120,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            color: theme.palette.primary.contrastText
                        },
                        '&:disabled': {
                            bgcolor: theme.palette.action.disabledBackground
                        }
                    }}
                >
                    {isLoading ? 'Generating...' : 'Regenerate'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomInstructionsModal;
