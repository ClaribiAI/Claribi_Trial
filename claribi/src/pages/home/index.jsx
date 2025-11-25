import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    useTheme,
    Alert,
    Button,
    Snackbar
} from '@mui/material';
import {
    CloudArrowUp,
    CheckCircle
} from '@phosphor-icons/react';
import { uploadPowerBIFile } from '../../services/powerbiChatService';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import { useNotification } from '../../contexts/NotificationContext';
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../contexts/AuthContext';
import statsService from '../../services/statsService';
import { shouldShowOnboarding, dismissOnboarding } from '../../services/onboardingService';
import StatsCards from './components/StatsCards';
import FileManagementPage from './FileManagementPage';
import FileActionSelectionDialog from './components/FileActionSelectionDialog';
import OnboardingGuide from '../../components/onboarding/OnboardingGuide';

const Home = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { files, loading, error, refreshFiles, removeFile } = useFiles();
    const { currentUser, loading: authLoading } = useAuth();
    
    // Check for login redirect immediately (synchronously) before AuthContext cleans URL params
    // Use useRef to store this value immediately on component initialization
    const fromLoginRedirectRef = useRef(false);
    if (!fromLoginRedirectRef.current) {
        const urlParams = new URLSearchParams(window.location.search);
        const authStatus = urlParams.get('auth');
        const isLoginRedirect = authStatus === 'success';
        if (isLoginRedirect) {
            sessionStorage.setItem('from_login_redirect', 'true');
            fromLoginRedirectRef.current = true;
        } else {
            // Also check sessionStorage in case URL was already cleaned
            fromLoginRedirectRef.current = sessionStorage.getItem('from_login_redirect') === 'true';
        }
    }
    
    // State management
    const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsData, setStatsData] = useState({
        timeSaved: 0,
        documentsGenerated: 0,
        chatQueries: 0
    });
    const [uploadError, setUploadError] = useState(null);
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
    
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
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    
    const fileInputRef = useRef(null);

    // Initialize session start time on first load
    useEffect(() => {
        if (!sessionStorage.getItem('session_start')) {
            sessionStorage.setItem('session_start', Date.now().toString());
        }
    }, []);

    // Check if onboarding guide should be shown (only after login redirect)
    useEffect(() => {
        // Check if we came from login redirect (from ref or sessionStorage)
        const fromLoginRedirect = fromLoginRedirectRef.current || sessionStorage.getItem('from_login_redirect') === 'true';
        
        // Only show onboarding if: user is authenticated, guide not dismissed, and came from login
        if (!authLoading && currentUser && shouldShowOnboarding() && fromLoginRedirect) {
            // Clear the flag so it doesn't show again on subsequent navigations
            sessionStorage.removeItem('from_login_redirect');
            fromLoginRedirectRef.current = false;
            setShowOnboardingGuide(true);
        }
    }, [currentUser, authLoading]);

    // Fetch stats on component mount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // First, try to get cached stats (synchronous, no loading state needed)
                const cached = statsService.getCachedStats();
                if (cached && cached.success && cached.data) {
                    setStatsData({
                        timeSaved: cached.data.time_saved || 0,
                        documentsGenerated: cached.data.documents_generated || 0,
                        chatQueries: cached.data.chat_queries || 0
                    });
                    setStatsLoading(false);
                    return; // Use cached data, don't fetch from backend
                }

                // No cache available, fetch from backend
                setStatsLoading(true);
                const response = await statsService.getUserStats(false); // Don't use cache, fetch fresh
                if (response.success && response.data) {
                    setStatsData({
                        timeSaved: response.data.time_saved || 0,
                        documentsGenerated: response.data.documents_generated || 0,
                        chatQueries: response.data.chat_queries || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setStatsLoading(false);
            }
        };
        
        fetchStats();
    }, []);

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
        navigate(`/powerbi-chat?fileId=${encodeURIComponent(file.collection_name)}`, { state: { selectedFile: file } });
    };

    const handleDocsClick = (file) => {
        navigate(`/powerbi-docs?fileId=${encodeURIComponent(file.collection_name)}`, { state: { selectedFile: file } });
    };

    const handleDiagnosticsClick = (file) => {
        navigate(`/powerbi-diagnostics?fileId=${encodeURIComponent(file.collection_name)}`, { state: { selectedFile: file } });
    };

    const handleSelectionDialogClose = () => {
        setSelectionDialogOpen(false);
        setSelectedFile(null);
    };

    const handleOpenInChat = () => {
        if (selectedFile) {
            navigate(`/powerbi-chat?fileId=${encodeURIComponent(selectedFile.collection_name)}`, { state: { selectedFile } });
        }
    };

    const handleOpenInDocs = () => {
        if (selectedFile) {
            navigate(`/powerbi-docs?fileId=${encodeURIComponent(selectedFile.collection_name)}`, { state: { selectedFile } });
        }
    };

    const handleOpenInDiagnostics = () => {
        if (selectedFile) {
            navigate(`/powerbi-diagnostics?fileId=${encodeURIComponent(selectedFile.collection_name)}`, { state: { selectedFile } });
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
            setUploadError('Please select a valid .pbix file');
            return;
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadError('File size must be less than 100MB');
            return;
        }

        // Store file and show confirmation dialog
        setPendingFile(file);
        setShowUploadConfirmation(true);
        setUploadError(null);
    };

    const handleConfirmUpload = async (renamedFile) => {
        setUploadLoading(true);
        setUploadProgress(0);
        setUploadError(null);

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
            await refreshFiles();

        } catch (err) {
            console.error('Error uploading file:', err);
            
            // Show specific error messages based on error type
            if (err.message.includes('File too large')) {
                setUploadError('File is too large. Please try with a file smaller than 100MB.');
            } else if (err.message.includes('Invalid file format')) {
                setUploadError('Invalid file format. Please ensure you are uploading a valid .pbix file.');
            } else if (err.message.includes('Server error during processing')) {
                setUploadError('Server error occurred. The server may have restarted. Please try again.');
            } else {
                setUploadError(err.message || 'Failed to upload file. Please try again.');
            }
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
        removeFile(deletedFile);
    };

    const handleOnboardingClose = () => {
        setShowOnboardingGuide(false);
    };

    const handleOnboardingDismiss = () => {
        dismissOnboarding();
        setShowOnboardingGuide(false);
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
            {uploadError && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <Alert 
                        severity="error" 
                        onClose={() => setUploadError(null)}
                        sx={{ borderRadius: 2 }}
                    >
                        {uploadError}
                    </Alert>
                </Box>
            )}

            {/* Header */}
            <Box 
                sx={{ 
                    bgcolor: theme.palette.background.chat,
                    py: 3,
                    px: 4
                }}
            >
                <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="space-between" 
                    gap={4}
                    sx={{
                        flexDirection: { xs: 'column', lg: 'row' },
                        alignItems: { xs: 'stretch', lg: 'center' }
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
                            Choose your Power BI experience. Chat with your Power BI dataset, generate comprehensive documentation, or run diagnostics.
                        </Typography>
                    </Box>
                    
                    {/* Upload New Button */}
                    <Button
                        variant="contained"
                        startIcon={<CloudArrowUp size={20} color={theme.palette.primary.contrastText} />}
                        onClick={handleUploadNew}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            height: 40,
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            '&:hover': { 
                                bgcolor: theme.palette.primary.dark,
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            },
                            transition: 'all 0.2s ease',
                            alignSelf: { xs: 'stretch', lg: 'center' }
                        }}
                    >
                        Upload New
                    </Button>
                </Box>
            </Box>

            {/* KPI Cards Section */}
            <StatsCards statsData={statsData} statsLoading={statsLoading} />

            {/* Main Content */}
            <FileManagementPage
                        onFileClick={handleFileClick}
                        onFileDelete={handleFileDelete}
                        onFileRefresh={refreshFiles}
                        onChatClick={handleChatClick}
                        onDocsClick={handleDocsClick}
                        onDiagnosticsClick={handleDiagnosticsClick}
                onUploadNew={handleUploadNew}
                    />
                            
            {/* Selection Dialog */}
            <FileActionSelectionDialog
                open={selectionDialogOpen}
                onClose={handleSelectionDialogClose}
                selectedFile={selectedFile}
                onChatClick={handleOpenInChat}
                onDocsClick={handleOpenInDocs}
                onDiagnosticsClick={handleOpenInDiagnostics}
            />

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

            {/* Onboarding Guide */}
            <OnboardingGuide
                open={showOnboardingGuide}
                onClose={handleOnboardingClose}
                onDismiss={handleOnboardingDismiss}
            />
        </Box>
    );
};

export default Home;
