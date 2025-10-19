import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    alpha,
    useTheme
} from '@mui/material';
import {
    CloudArrowUp,
    X
} from '@phosphor-icons/react';
import LoadingSpinner from './LoadingSpinner';

const UploadConfirmationDialog = ({ open, onClose, onConfirm, file, isUploading = false }) => {
    const theme = useTheme();
    const [filename, setFilename] = useState('');
    const [error, setError] = useState('');
    const MAX_FILENAME_LENGTH = 100;

    useEffect(() => {
        if (file && open) {
            setFilename(file.name);
            setError('');
        }
    }, [file, open]);

    const handleFilenameChange = (event) => {
        const value = event.target.value;
        if (value.length <= MAX_FILENAME_LENGTH) {
            setFilename(value);
            setError('');
        }
    };

    const handleConfirm = () => {
        const trimmedFilename = filename.trim();
        
        if (!trimmedFilename) {
            setError('Filename cannot be empty');
            return;
        }

        if (trimmedFilename.length > MAX_FILENAME_LENGTH) {
            setError(`Filename must be ${MAX_FILENAME_LENGTH} characters or less`);
            return;
        }

        // Create new file with renamed filename
        const renamedFile = new File([file], trimmedFilename, { type: file.type });
        onConfirm(renamedFile);
        // Don't close dialog here - let parent handle it after upload completes
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const remainingChars = MAX_FILENAME_LENGTH - filename.length;

    return (
        <Dialog 
            open={open} 
            onClose={isUploading ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CloudArrowUp size={24} color={theme.palette.primary.main} />
                        <Typography variant="h6" component="h2" sx={{ color: theme.palette.text.primary }}>
                            Confirm File Upload
                        </Typography>
                    </Box>
                    <Button
                        onClick={onClose}
                        disabled={isUploading}
                        sx={{
                            minWidth: 'auto',
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            bgcolor: 'transparent',
                            color: theme.palette.text.secondary,
                            p: 0,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main
                            },
                            '&:disabled': {
                                color: alpha(theme.palette.text.secondary, 0.5)
                            }
                        }}
                    >
                        <X size={20} />
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2 }}>
                {/* File Info */}
                <Box 
                    sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        mb: 3
                    }}
                >
                    <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {file?.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            {file ? formatFileSize(file.size) : ''}
                        </Typography>
                    </Box>
                </Box>

                {/* Filename Input */}
                <Box>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 500, color: theme.palette.text.primary }}>
                        Rename file (optional)
                    </Typography>
                    <TextField
                        fullWidth
                        value={filename}
                        onChange={handleFilenameChange}
                        placeholder="Enter filename..."
                        variant="outlined"
                        disabled={isUploading}
                        error={!!error}
                        helperText={error || `You can rename the file as desired. ${remainingChars} characters remaining.`}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: theme.palette.background.paper,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.02)
                                },
                                '&.Mui-focused': {
                                    bgcolor: theme.palette.background.paper,
                                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
                                }
                            }
                        }}
                    />
                </Box>

            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={isUploading}
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={isUploading}
                    startIcon={isUploading ? <LoadingSpinner size={16} compact /> : <CloudArrowUp size={16} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                    sx={{ 
                        borderRadius: 2,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark
                        },
                        '&:disabled': {
                            bgcolor: alpha(theme.palette.primary.main, 0.3),
                            color: alpha(theme.palette.primary.contrastText, 0.5)
                        }
                    }}
                >
                    {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadConfirmationDialog;
