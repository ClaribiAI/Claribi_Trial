import React, { useState, useRef } from 'react';
import {
    Box,
    Alert,
    Snackbar
} from '@mui/material';
import {
    CheckCircle
} from '@phosphor-icons/react';
import { uploadPowerBIFile, deletePowerBISession } from '../../services/powerbiChatService';
import FileSelectionDialog from '../../components/ui/FileSelectionDialog';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import FileManagementPage from './FileManagementPage';
import ChatPage from './ChatPage';
import { useNotification } from '../../contexts/NotificationContext';

const PowerBIChat = () => {
    const { showNotification } = useNotification();
    const [currentView, setCurrentView] = useState('file-management'); // 'file-management' or 'chat'
    const [pbixFile, setPbixFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [isNewlyUploaded, setIsNewlyUploaded] = useState(false);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

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
            
            setPbixFile({
                name: renamedFile.name,
                size: renamedFile.size,
                uploadId: response.upload_id || Date.now(),
                sessionId: response.session_id,
                metadata: response.metadata
            });
            setIsNewlyUploaded(true);

            // Show success message
            setSuccessMessage('Power BI file uploaded and analyzed successfully!');
            setShowUploadSuccess(true);
            setTimeout(() => setShowUploadSuccess(false), 6000);

            // Close confirmation dialog and switch to chat view
            setShowUploadConfirmation(false);
            setPendingFile(null);
            setCurrentView('chat');

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

    const handleFileSelect = (selectedFile) => {
        // Map collection_name to sessionId for compatibility with the backend
        const fileWithSessionId = {
            ...selectedFile,
            sessionId: selectedFile.collection_name,
            name: selectedFile.filename
        };
        setPbixFile(fileWithSessionId);
        setIsNewlyUploaded(false);
        // Don't show success notification for already uploaded files
        setCurrentView('chat');
    };

    const handleUploadNew = () => {
        setShowFileSelection(false);
        fileInputRef.current?.click();
    };

    const handleCloseUploadConfirmation = () => {
        if (uploadLoading) {
            return; // Prevent closing while uploading
        }
        setShowUploadConfirmation(false);
        setPendingFile(null);
    };

    const handleBackToFileManagement = () => {
        // Reset the newly uploaded flag first to prevent deletion
        setIsNewlyUploaded(false);
        
        setPbixFile(null);
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
                    onFileSelect={handleFileSelect}
                    onUploadNew={handleUploadNew}
                />
            ) : (
                <ChatPage 
                    pbixFile={pbixFile}
                    onBack={handleBackToFileManagement}
                    isNewlyUploaded={isNewlyUploaded}
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
                    {successMessage} <strong>{pbixFile?.name}</strong>
                </Alert>
            </Snackbar>

            {/* File Selection Dialog */}
            <FileSelectionDialog
                open={showFileSelection}
                onClose={() => setShowFileSelection(false)}
                onFileSelect={handleFileSelect}
                onUploadNew={handleUploadNew}
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

export default PowerBIChat; 