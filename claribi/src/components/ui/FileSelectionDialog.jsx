import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Chip,
    Alert,
    Divider,
    Card,
    CardContent,
    Avatar,
    alpha,
    useTheme
} from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
import {
    FileText,
    Calendar,
    Database,
    ChartBar,
    Link,
    Columns,
    Code,
    Trash,
    CloudArrowUp,
    X,
    CheckCircle,
    Eye
} from '@phosphor-icons/react';
import { getUploadedFiles, deletePowerBISession } from '../../services/powerbiChatService';
import { useNotification } from '../../contexts/NotificationContext';
import ConfirmationDialog from './ConfirmationDialog';

const FileSelectionDialog = ({ open, onClose, onFileSelect, onUploadNew }) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletingFile, setDeletingFile] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    useEffect(() => {
        if (open) {
            loadFiles();
        }
    }, [open]);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const uploadedFiles = await getUploadedFiles();
            setFiles(uploadedFiles);
        } catch (err) {
            console.error('Error loading files:', err);
            setError(err.message || 'Failed to load uploaded files');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (file) => {
        onFileSelect({
            name: file.filename,
            size: file.file_size,
            uploadId: file.collection_name,
            sessionId: file.collection_name,
            metadata: file.metadata,
            uploadTime: file.upload_time,
            documentCount: file.document_count
        });
        onClose();
    };

    const handleDeleteFile = (file) => {
        setFileToDelete(file);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;

        setConfirmDialogOpen(false);
        setDeletingFile(fileToDelete.collection_name);
        
        try {
            await deletePowerBISession(fileToDelete.collection_name);
            setFiles(prev => prev.filter(f => f.collection_name !== fileToDelete.collection_name));
            showNotification(`File "${fileToDelete.filename}" deleted successfully!`, 'success');
        } catch (err) {
            console.error('Error deleting file:', err);
            setError(err.message || 'Failed to delete file');
            showNotification(`Failed to delete "${fileToDelete.filename}". ${err.message || 'Please try again.'}`, 'error');
        } finally {
            setDeletingFile(null);
            setFileToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
        setFileToDelete(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'Invalid date';
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
                    maxHeight: '80vh',
                    bgcolor: theme.palette.background.paper
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <FileText size={24} color={theme.palette.primary.main} />
                        <Typography variant="h6" component="h2" sx={{ color: theme.palette.text.primary }}>
                            Select PBIX File
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <X size={20} />
                    </IconButton>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                    Choose a previously uploaded PBIX file to start chatting with, or upload a new one.
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ px: 0 }}>
                {loading && (
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <LoadingSpinner size={24} />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && files.length === 0 && (
                    <Box textAlign="center" py={4}>
                        <FileText size={48} color={theme.palette.grey[400]} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1, color: theme.palette.text.secondary }}>
                            No uploaded files found
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            Upload a PBIX file to get started with Power BI chat.
                        </Typography>
                    </Box>
                )}

                {!loading && !error && files.length > 0 && (
                    <List sx={{ px: 0 }}>
                        {files.map((file, index) => (
                            <React.Fragment key={file.collection_name}>
                                <ListItem sx={{ px: 2, py: 1 }}>
                                    <Card 
                                        sx={{ 
                                            width: '100%',
                                            cursor: 'pointer',
                                            bgcolor: theme.palette.background.paper
                                        }}
                                    >
                                        <Box
                                            onClick={() => handleFileSelect(file)}
                                            sx={{
                                                cursor: deletingFile === file.collection_name ? 'not-allowed' : 'pointer',
                                                opacity: deletingFile === file.collection_name ? 0.6 : 1,
                                                '&:hover': {
                                                    bgcolor: theme.palette.background.hover,
                                                    '& .MuiTypography-root': {
                                                        color: theme.palette.text.primary
                                                    },
                                                    '& .file-name': {
                                                        color: '#FCC000'
                                                    }
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                <Box display="flex" alignItems="flex-start" gap={2}>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: theme.palette.primary.main,
                                                            width: 40,
                                                            height: 40
                                                        }}
                                                    >
                                                        <FileText size={20} />
                                                    </Avatar>
                                                    
                                                    <Box flexGrow={1} minWidth={0}>
                                                        <Typography 
                                                            variant="h6" 
                                                            component="h3"
                                                            className="file-name"
                                                            sx={{ 
                                                                fontWeight: 600,
                                                                mb: 0.5,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                color: 'inherit'
                                                            }}
                                                        >
                                                            {file.filename}
                                                        </Typography>
                                                        
                                                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                                                {formatFileSize(file.file_size)}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                                                {formatDate(file.upload_time)}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                                                {file.document_count} documents
                                                            </Typography>
                                                        </Box>

                                                        {/* Metadata chips */}
                                                        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                                                            <Chip
                                                                icon={<Database size={14} />}
                                                                label={`${file.metadata.tables_count} tables`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                            <Chip
                                                                icon={<ChartBar size={14} />}
                                                                label={`${file.metadata.measures_count} measures`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                            <Chip
                                                                icon={<Eye size={14} />}
                                                                label={`${file.metadata.visuals_count || 0} visuals`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                            <Chip
                                                                icon={<Link size={14} />}
                                                                label={`${file.metadata.relationships_count} relationships`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                            <Chip
                                                                icon={<Columns size={14} />}
                                                                label={`${file.metadata.columns_count} columns`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                            <Chip
                                                                icon={<Code size={14} />}
                                                                label={`${file.metadata.power_query_scripts_count} Power Query scripts`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="default"
                                                            />
                                                        </Box>
                                                    </Box>

                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {deletingFile === file.collection_name ? (
                                                            <LoadingSpinner size={20} compact />
                                                        ) : (
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteFile(file);
                                                                }}
                                                                sx={{ 
                                                                    color: theme.palette.error.main,
                                                                    '&:hover': {
                                                                        bgcolor: alpha(theme.palette.error.main, 0.1)
                                                                    }
                                                                }}
                                                            >
                                                                <Trash size={16} />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Box>
                                    </Card>
                                </ListItem>
                                {index < files.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onUploadNew}
                    variant="contained"
                    startIcon={<CloudArrowUp size={16} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                    sx={{ 
                        borderRadius: 2,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark
                        }
                    }}
                >
                    Upload New File
                </Button>
            </DialogActions>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete File"
                message={`Are you sure you want to delete "${fileToDelete?.filename}"? This action cannot be undone and will permanently remove the file and all its associated data.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                isLoading={deletingFile === fileToDelete?.collection_name}
            />
        </Dialog>
    );
};

export default FileSelectionDialog;
