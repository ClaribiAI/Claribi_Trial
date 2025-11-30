import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    useTheme,
    Alert,
    Button,
    Snackbar,
    IconButton,
    alpha
} from '@mui/material';
import {
    CloudArrowUp,
    CheckCircle,
    FileText,
    ChatCircle,
    Stethoscope,
    House,
    Question
} from '@phosphor-icons/react';
import { uploadPowerBIFile } from '../../services/powerbiChatService';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import { useNotification } from '../../contexts/NotificationContext';
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import statsService from '../../services/statsService';
import { shouldShowOnboarding, dismissOnboarding, resetOnboarding } from '../../services/onboardingService';
import StatsCards from './components/StatsCards';
import FileManagementPage from './FileManagementPage';
import FileActionSelectionDialog from './components/FileActionSelectionDialog';
import OnboardingGuide from '../../components/onboarding/OnboardingGuide';

const Home = () => {
    const theme = useTheme();
    const { isDarkMode } = useCustomTheme();
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
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
    const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
    const onboardingDismissedRef = useRef(false);
    
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
    const uploadButtonRef = useRef(null);

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
        if (!authLoading && currentUser && shouldShowOnboarding() && fromLoginRedirect && !onboardingDismissedRef.current) {
            // Clear the flag so it doesn't show again on subsequent navigations
            sessionStorage.removeItem('from_login_redirect');
            fromLoginRedirectRef.current = false;
            setShowOnboardingGuide(true);
            setCurrentOnboardingStep(0);
        }
    }, [currentUser, authLoading]);

    // Fetch stats function (can be called on mount or refresh)
    const fetchStats = async (useCache = true) => {
        try {
            // First, try to get cached stats (synchronous, no loading state needed)
            if (useCache) {
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
            }

            // No cache available or refresh requested, fetch from backend
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

    // Fetch stats on component mount
    useEffect(() => {
        fetchStats(true); // Use cache on initial load
    }, []);

    // Handle refresh stats
    const handleRefreshStats = () => {
        fetchStats(false); // Don't use cache, fetch fresh
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
            showNotification('Please select a valid .pbix file', 'error');
            return;
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification('File size must be less than 100MB', 'error');
            return;
        }

        // Store file and show confirmation dialog
        setPendingFile(file);
        setShowUploadConfirmation(true);
    };

    const handleConfirmUpload = async (renamedFile) => {
        setUploadLoading(true);
        setUploadProgress(0);

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
                showNotification('File is too large. Please try with a file smaller than 100MB.', 'error');
            } else if (err.message.includes('Invalid file format')) {
                showNotification('Invalid file format. Please ensure you are uploading a valid .pbix file.', 'error');
            } else if (err.message.includes('Server error during processing')) {
                showNotification('Server error occurred. Please try again.', 'error');
            } else {
                showNotification(err.message || 'Failed to upload file. Please try again.', 'error');
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
        // Set ref FIRST to prevent useEffect from reopening
        onboardingDismissedRef.current = true;
        // Dismiss onboarding when closed to prevent it from reopening
        dismissOnboarding();
        // Then close the tour
        setShowOnboardingGuide(false);
    };

    const handleOnboardingDismiss = () => {
        dismissOnboarding();
        setShowOnboardingGuide(false);
        onboardingDismissedRef.current = true;
    };

    // Define onboarding tour steps
    const onboardingSteps = [
        {
            title: 'Welcome to Claribi Console',
            description: 'Your intelligent companion for Power BI. Discover how to transform your data into insights with AI-powered documentation, chat, and diagnostics.',
            icon: (
                <Box
                    component="img"
                    src={isDarkMode ? '/claribi_icon_logo_dark.png' : '/claribi_icon_logo_light.png'}
                    alt="Claribi Logo"
                    sx={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain'
                    }}
                />
            ),
            position: 'center',
            noHighlight: true,
            getTargetElement: () => null
        },
        {
            title: 'Upload Your Power BI File',
            description: 'Start by uploading your Power BI (.pbix) file. Click the "Upload New" button to select and upload your file. Once uploaded, your file will be analyzed and ready for use.',
            icon: <CloudArrowUp size={20} />,
            position: 'bottom-right',
            getTargetElement: () => uploadButtonRef
        },
        {
            title: 'Generate Documentation',
            description: 'Create comprehensive documentation for your Power BI dataset. Get detailed insights on data models, relationships, security settings, and best practice recommendations.',
            icon: <FileText size={20} />,
            position: 'right',
            getTargetElement: () => {
                const element = document.querySelector('[data-onboarding-target="sidebar-docs"]');
                return element ? { current: element } : null;
            }
        },
        {
            title: 'Chat with Your Dataset',
            description: 'Have real-time conversations with your Power BI dataset. Ask questions, get full DAX and M code generated, get help with creating new visuals and more. Simply select a file and start chatting.',
            icon: <ChatCircle size={20} />,
            position: 'right',
            getTargetElement: () => {
                const element = document.querySelector('[data-onboarding-target="sidebar-chat"]');
                return element ? { current: element } : null;
            }
        },
        {
            title: 'Run Diagnostics',
            description: 'Get actionable improvement recommendations for your Power BI file. Identify performance issues, optimization opportunities, and areas for enhancement.',
            icon: <Stethoscope size={20} />,
            position: 'right',
            getTargetElement: () => {
                const element = document.querySelector('[data-onboarding-target="sidebar-diagnostics"]');
                return element ? { current: element } : null;
            }
        },
        {
            title: 'Navigate to Home',
            description: 'Use the Home menu item to return to the main page where you can view all your uploaded files, statistics and quickly access your recent files.',
            icon: <House size={20} />,
            position: 'right',
            getTargetElement: () => {
                const element = document.querySelector('[data-onboarding-target="sidebar-home"]');
                return element ? { current: element } : null;
            }
        }
    ];

    // Tour navigation handlers
    const handleOnboardingNext = () => {
        if (currentOnboardingStep < onboardingSteps.length - 1) {
            setCurrentOnboardingStep(prev => prev + 1);
        } else {
            // Last step - close and dismiss
            handleOnboardingClose();
        }
    };

    const handleOnboardingBack = () => {
        if (currentOnboardingStep > 0) {
            setCurrentOnboardingStep(prev => prev - 1);
        }
    };

    const handleOnboardingSkip = () => {
        setShowOnboardingGuide(false);
        // Dismiss onboarding when skipped to prevent it from reopening
        dismissOnboarding();
        onboardingDismissedRef.current = true;
    };

    const handleRestartOnboarding = () => {
        resetOnboarding();
        onboardingDismissedRef.current = false;
        setCurrentOnboardingStep(0);
        setShowOnboardingGuide(true);
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

            {/* Header */}
            <Box 
                sx={{ 
                    bgcolor: theme.palette.background.chat,
                    py: 3,
                    px: 4,
                    position: 'relative'
                }}
            >
                {/* Help/Onboarding Restart Button */}
                <IconButton
                    onClick={handleRestartOnboarding}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 16,
                        color: theme.palette.text.secondary,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.hover, 0.5),
                            color: theme.palette.text.primary
                        },
                        transition: 'all 0.2s ease',
                        zIndex: 1
                    }}
                    title="Restart Onboarding Tour"
                >
                    <Question size={20} />
                </IconButton>

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
                            Choose your experience. Chat with your Power BI dataset, generate comprehensive documentation, or run diagnostics.
                        </Typography>
                    </Box>
                    
                    {/* Upload New Button */}
                    <Button
                        ref={uploadButtonRef}
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
            <StatsCards 
                statsData={statsData} 
                statsLoading={statsLoading} 
                onRefresh={handleRefreshStats}
            />

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
            {showOnboardingGuide && (
                <OnboardingGuide
                    open={showOnboardingGuide}
                    onClose={handleOnboardingClose}
                    steps={onboardingSteps}
                    currentStepIndex={currentOnboardingStep}
                    onNext={handleOnboardingNext}
                    onBack={handleOnboardingBack}
                    onSkip={handleOnboardingSkip}
                    targetElement={onboardingSteps[currentOnboardingStep]?.getTargetElement?.()}
                />
            )}
        </Box>
    );
};

export default Home;
