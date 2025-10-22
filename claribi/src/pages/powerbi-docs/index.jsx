import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Alert,
    Snackbar
} from '@mui/material';
import {
    CheckCircle
} from '@phosphor-icons/react';
import { uploadPowerBIFile } from '../../services/powerbiChatService';
import FileSelectionDialog from '../../components/ui/FileSelectionDialog';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import FileManagementPage from './FileManagementPage';
import DocumentationPage from './DocumentationPage';

const PowerBIDocumentation = () => {
    const location = useLocation();
    const [currentView, setCurrentView] = useState('file-management'); // 'file-management' or 'documentation'
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    // Handle file selection from navigation state
    useEffect(() => {
        if (location.state?.selectedFile) {
            handleFileSelect(location.state.selectedFile);
        }
    }, [location.state]);

    const handleUploadNew = () => {
        setShowFileSelection(true);
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
            setShowFileSelection(false);
            
            // Map collection_name to sessionId for compatibility with the backend
            const fileWithSessionId = {
                ...response,
                sessionId: response.session_id || response.collection_name,
                filename: renamedFile.name,
                collection_name: response.session_id || response.collection_name
            };
            setSelectedFile(fileWithSessionId);
            setCurrentView('documentation');

        } catch (err) {
            console.error('Error uploading file:', err);
            
            // Retry logic for connection errors
            if ((err.message.includes('Connection was interrupted') || 
                 err.message.includes('Network error') || 
                 err.message.includes('ECONNRESET')) && 
                retryCount < 2) {
                setRetryCount(prev => prev + 1);
                setError(`Upload failed (attempt ${retryCount + 1}/3). Retrying...`);
                
                // Wait 2 seconds before retry
                setTimeout(() => {
                    handleConfirmUpload(renamedFile);
                }, 2000);
                return;
            }
            
            setError(err.message || 'Failed to upload file. Please try again.');
            setRetryCount(0);
        } finally {
            setUploadLoading(false);
            setUploadProgress(0);
        }
    };

    const handleFileClick = (file) => {
        setSelectedFile(file);
        setCurrentView('documentation');
    };

    const handleFileSelect = (selectedFile) => {
        // Map collection_name to sessionId for compatibility with the backend
        const fileWithSessionId = {
            ...selectedFile,
            sessionId: selectedFile.collection_name,
            name: selectedFile.filename
        };
        setSelectedFile(fileWithSessionId);
        setCurrentView('documentation');
        setShowFileSelection(false);
        setShowUploadSuccess(true);
        setSuccessMessage('File selected successfully!');
        setTimeout(() => setShowUploadSuccess(false), 6000);
    };

    const handleCloseUploadConfirmation = () => {
        if (uploadLoading) {
            return; // Prevent closing while uploading
        }
        setShowUploadConfirmation(false);
        setPendingFile(null);
    };

    const handleFileDelete = (deletedFile) => {
        // If the deleted file was selected, clear selection and go back to file management
        if (selectedFile && selectedFile.collection_name === deletedFile.collection_name) {
            setSelectedFile(null);
            setCurrentView('file-management');
        }
    };

    const handleBackToFileManagement = () => {
        setSelectedFile(null);
        setShowUploadSuccess(false);
        setCurrentView('file-management');
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

            {/* Render appropriate view */}
            {currentView === 'file-management' ? (
                <FileManagementPage 
                    onFileSelect={handleFileClick}
                    onUploadNew={() => fileInputRef.current?.click()}
                />
            ) : (
                <DocumentationPage 
                    selectedFile={selectedFile}
                    onBack={handleBackToFileManagement}
                    showUploadSuccess={showUploadSuccess}
                    successMessage={successMessage}
                />
            )}

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
                    {successMessage} <strong>{selectedFile?.filename || selectedFile?.name}</strong> is ready for documentation generation.
                </Alert>
            </Snackbar>

            {/* File Selection Dialog */}
            <FileSelectionDialog
                open={showFileSelection}
                onClose={() => setShowFileSelection(false)}
                onFileSelect={handleFileSelect}
                onUploadNew={() => {
                    setShowFileSelection(false);
                    fileInputRef.current?.click();
                }}
            />

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

export default PowerBIDocumentation;