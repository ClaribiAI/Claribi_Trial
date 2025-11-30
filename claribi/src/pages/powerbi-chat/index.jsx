import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import { useFiles } from '../../contexts/FileContext';

const PowerBIChat = () => {
    const { showNotification } = useNotification();
    const { refreshFiles, files } = useFiles();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentView, setCurrentView] = useState('file-management'); // 'file-management' or 'chat'
    const [pbixFile, setPbixFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [isNewlyUploaded, setIsNewlyUploaded] = useState(false);

    const fileInputRef = useRef(null);

    // Handle file selection from navigation state or URL
    useEffect(() => {
        if (location.state?.selectedFile) {
            handleFileSelect(location.state.selectedFile);
        }
    }, [location.state]);

    // Load file from URL fileId parameter
    useEffect(() => {
        const fileId = searchParams.get('fileId');
        if (fileId && files.length > 0) {
            const file = files.find(f => f.collection_name === fileId);
            if (file) {
                const fileWithSessionId = {
                    ...file,
                    sessionId: file.collection_name,
                    name: file.filename
                };
                setPbixFile(fileWithSessionId);
                setIsNewlyUploaded(false);
                setCurrentView('chat');
            }
        }
    }, [searchParams, files]);

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
            
            const fileWithSessionId = {
                name: renamedFile.name,
                size: renamedFile.size,
                uploadId: response.upload_id || Date.now(),
                sessionId: response.session_id || response.collection_name,
                collection_name: response.session_id || response.collection_name,
                metadata: response.metadata
            };
            setPbixFile(fileWithSessionId);
            setIsNewlyUploaded(true);

            // Show success message
            setSuccessMessage('Power BI file uploaded and analyzed successfully!');
            setShowUploadSuccess(true);
            setTimeout(() => setShowUploadSuccess(false), 6000);

            // Close confirmation dialog and switch to chat view
            setShowUploadConfirmation(false);
            setPendingFile(null);
            setCurrentView('chat');
            // Update URL with fileId
            setSearchParams({ fileId: fileWithSessionId.collection_name });
            
            // Refresh the files list to include the new upload
            await refreshFiles();

        } catch (err) {
            console.error('Error uploading file:', err);
            showNotification(err.message || 'Failed to upload file. Please try again.', 'error');
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
        // Update URL with fileId
        setSearchParams({ fileId: selectedFile.collection_name });
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
        // Remove fileId from URL
        setSearchParams({});
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