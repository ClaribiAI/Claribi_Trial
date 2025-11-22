import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    useTheme,
    alpha,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Snackbar
} from '@mui/material';
import {
    ChatCircle,
    FileText,
    CloudArrowUp,
    CheckCircle,
    Stethoscope
} from '@phosphor-icons/react';
import { getUploadedFiles, uploadPowerBIFile } from '../../services/powerbiChatService';
import FileTable from '../../components/ui/FileTable';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatsCard from '../../components/ui/StatsCard';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import { useNotification } from '../../contexts/NotificationContext';

const Home = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    // State management
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return 'Good morning';
        } else if (hour >= 12 && hour < 18) {
            return 'Good afternoon';
        } else {
            return 'Good evening';
        }
    };
    
    // Upload state management
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    
    const fileInputRef = useRef(null);

    // Load files on component mount
    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const uploadedFiles = await getUploadedFiles();
            setFiles(uploadedFiles);
        } catch (err) {
            console.error('Error loading files:', err);
            setError(err.message || 'Failed to load files');
            showNotification('Failed to load files. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateToChat = () => {
        navigate('/powerbi-chat');
    };

    const handleNavigateToDocs = () => {
        navigate('/powerbi-docs');
    };

    // File selection handlers
    const handleFileClick = (file) => {
        setSelectedFile(file);
        setSelectionDialogOpen(true);
    };

    const handleChatClick = (file) => {
        navigate('/powerbi-chat', { state: { selectedFile: file } });
    };

    const handleDocsClick = (file) => {
        navigate('/powerbi-docs', { state: { selectedFile: file } });
    };

    const handleDiagnosticsClick = (file) => {
        navigate('/powerbi-diagnostics', { state: { selectedFile: file } });
    };

    const handleSelectionDialogClose = () => {
        setSelectionDialogOpen(false);
        setSelectedFile(null);
    };

    const handleOpenInChat = () => {
        if (selectedFile) {
            navigate('/powerbi-chat', { state: { selectedFile } });
        }
    };

    const handleOpenInDocs = () => {
        if (selectedFile) {
            navigate('/powerbi-docs', { state: { selectedFile } });
        }
    };

    const handleOpenInDiagnostics = () => {
        if (selectedFile) {
            navigate('/powerbi-diagnostics', { state: { selectedFile } });
        }
    };

    const handleUploadNew = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pbix')) {
            setError('Please select a valid .pbix file');
            return;
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size must be less than 100MB');
            return;
        }

        // Store file and show confirmation dialog
        setPendingFile(file);
        setShowUploadConfirmation(true);
        setError(null);
    };

    const handleConfirmUpload = async (renamedFile) => {
        setUploadLoading(true);
        setUploadProgress(0);
        setError(null);
        setRetryCount(0);

        try {
            const response = await uploadPowerBIFile(renamedFile, (progress) => {
                setUploadProgress(progress);
            });
            
            // Show success message
            setSuccessMessage('Power BI file uploaded and analyzed successfully!');
            setShowUploadSuccess(true);
            setTimeout(() => setShowUploadSuccess(false), 6000);

            // Close confirmation dialog and refresh files list
            setShowUploadConfirmation(false);
            setPendingFile(null);
            
            // Reload files to show the new upload
            await loadFiles();

        } catch (err) {
            console.error('Error uploading file:', err);
            
            // Enhanced retry logic for various error types
            const shouldRetry = (
                err.message.includes('Connection was interrupted') || 
                err.message.includes('Network error') || 
                err.message.includes('ECONNRESET') ||
                err.message.includes('Server error during processing') ||
                err.message.includes('Server temporarily unavailable')
            ) && retryCount < 2;
            
            if (shouldRetry) {
                setRetryCount(prev => prev + 1);
                setError(`Upload failed (attempt ${retryCount + 1}/3). Retrying in 3 seconds...`);
                
                // Wait 3 seconds before retry (increased from 2 seconds)
                setTimeout(() => {
                    handleConfirmUpload(renamedFile);
                }, 3000);
                return;
            }
            
            // Show specific error messages based on error type
            if (err.message.includes('File too large')) {
                setError('File is too large. Please try with a file smaller than 100MB.');
            } else if (err.message.includes('Invalid file format')) {
                setError('Invalid file format. Please ensure you are uploading a valid .pbix file.');
            } else if (err.message.includes('Server error during processing')) {
                setError('Server error occurred. The server may have restarted. Please try again.');
            } else {
                setError(err.message || 'Failed to upload file. Please try again.');
            }
            setRetryCount(0);
        } finally {
            setUploadLoading(false);
            setUploadProgress(0);
        }
    };

    const handleCloseUploadConfirmation = () => {
        if (uploadLoading) {
            return; // Prevent closing while uploading
        }
        setShowUploadConfirmation(false);
        setPendingFile(null);
    };

    const handleFileDelete = (deletedFile) => {
        setFiles(prev => prev.filter(f => f.collection_name !== deletedFile.collection_name));
    };

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pbix"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Error Alert */}
            {error && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <Alert 
                        severity="error" 
                        onClose={() => setError(null)}
                        sx={{ borderRadius: 2 }}
                    >
                        {error}
                    </Alert>
                </Box>
            )}

            {/* Header */}
            <Box 
                sx={{ 
                    bgcolor: theme.palette.sidebar.background,
                    py: 3,
                    px: 4,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
            >
                <Box 
                    display="flex" 
                    alignItems="flex-start" 
                    justifyContent="space-between" 
                    gap={4}
                    sx={{
                        flexDirection: { xs: 'column', lg: 'row' },
                        alignItems: { xs: 'stretch', lg: 'flex-start' }
                    }}
                >
                    <Box flex={1}>
                        <Typography variant="h4" sx={{ 
                            fontWeight: 700, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                            mb: 0.5
                        }}>
                           {getTimeBasedGreeting()}!
                        </Typography>
                        <Typography variant="h6" sx={{ 
                            color: theme.palette.text.secondary, 
                            fontWeight: 400
                        }}>
                            Choose your Power BI experience. Chat with your Power BI dataset or generate comprehensive documentation.
                        </Typography>
                    </Box>
                    
                    {/* Stats Card */}
                    <Box sx={{ 
                        minWidth: { xs: '100%', lg: 400 }, 
                        maxWidth: { xs: '100%', lg: 500 },
                        alignSelf: { xs: 'center', lg: 'flex-start' }
                    }}>
                        <StatsCard />
                    </Box>
                </Box>
            </Box>

            {/* Main Content */}
            <Box 
                sx={{
                    flexGrow: 1,
                    py: 4,
                    px: 4,
                    bgcolor: theme.palette.background.chat,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {loading ? (
                <Box 
                    sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                            justifyContent: 'center', 
                            height: '100%',
                            py: 8,
                            px: 4
                    }}
                >
                        <LoadingSpinner size={48} />
                    </Box>
                ) : files.length === 0 ? (
                    <Box
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            textAlign: 'center',
                            py: 8,
                            px: 4
                        }}
                    >
                        <Box 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                                mb: 4,
                                border: `2px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.15)}`,
                                boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                        >
                            <CloudArrowUp size={64} />
                </Box>
                <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    mb: 2, 
                    color: theme.palette.text.primary,
                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                }}>
                            No files uploaded yet
                </Typography>
                <Typography variant="h6" sx={{ 
                    color: theme.palette.text.secondary, 
                            mb: 6, 
                    maxWidth: 600,
                    lineHeight: 1.6,
                    fontWeight: 400
                }}>
                            Upload a Power BI (.pbix) file to get started. Choose between interactive chat or comprehensive documentation generation.
                </Typography>

                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                startIcon={<ChatCircle size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                        onClick={handleNavigateToChat}
                        sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    height: 48,
                                    bgcolor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                            '&:hover': {
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Start Chatting
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<FileText size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                                onClick={handleNavigateToDocs}
                                sx={{ 
                                    borderRadius: 3, 
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    height: 48,
                                    bgcolor: theme.palette.secondary.main,
                                    color: theme.palette.secondary.contrastText,
                                    '&:hover': { 
                                        bgcolor: theme.palette.secondary.dark,
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Generate Docs
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <FileTable 
                        files={files} 
                        onFileClick={handleFileClick}
                        onUploadNew={handleUploadNew}
                        onFileDelete={handleFileDelete}
                        actionType="both"
                        onChatClick={handleChatClick}
                        onDocsClick={handleDocsClick}
                        onDiagnosticsClick={handleDiagnosticsClick}
                    />
                )}
                            </Box>
                            
            {/* Selection Dialog */}
            <Dialog
                open={selectionDialogOpen}
                onClose={handleSelectionDialogClose}
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
                            onClick={handleOpenInChat}
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
                            onClick={handleOpenInDocs}
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
                            onClick={handleOpenInDiagnostics}
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
                        onClick={handleSelectionDialogClose}
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

            {/* Success Snackbar */}
            <Snackbar
                open={showUploadSuccess}
                autoHideDuration={6000}
                onClose={() => setShowUploadSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 9999 }}
            >
                <Alert 
                    onClose={() => setShowUploadSuccess(false)} 
                    severity="success"
                    icon={<CheckCircle size={20} />}
                    sx={{ 
                        width: '100%',
                        boxShadow: 3,
                        fontFamily: "'Nunito Sans', sans-serif"
                    }}
                >
                    {successMessage}
                </Alert>
            </Snackbar>

            {/* Upload Confirmation Dialog */}
            <UploadConfirmationDialog
                open={showUploadConfirmation}
                onClose={handleCloseUploadConfirmation}
                onConfirm={handleConfirmUpload}
                file={pendingFile}
                isUploading={uploadLoading}
            />
        </Box>
    );
};

export default Home;
