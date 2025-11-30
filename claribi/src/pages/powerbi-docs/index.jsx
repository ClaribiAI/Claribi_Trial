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
import { uploadPowerBIFile } from '../../services/powerbiChatService';
import FileSelectionDialog from '../../components/ui/FileSelectionDialog';
import UploadConfirmationDialog from '../../components/ui/UploadConfirmationDialog';
import FileManagementPage from './FileManagementPage';
import DocumentationPage from './DocumentationPage';
import { useFiles } from '../../contexts/FileContext';
import { useNotification } from '../../contexts/NotificationContext';

const PowerBIDocumentation = () => {
    const { showNotification } = useNotification();
    const { refreshFiles, files } = useFiles();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentView, setCurrentView] = useState('file-management'); // 'file-management' or 'documentation'
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
                setSelectedFile(fileWithSessionId);
                setCurrentView('documentation');
            }
        }
    }, [searchParams, files]);

    const handleUploadNew = () => {
        setShowFileSelection(true);
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

    const handleFileClick = (file) => {
        // Map collection_name to sessionId for compatibility with the backend
        const fileWithSessionId = {
            ...file,
            sessionId: file.collection_name,
            name: file.filename
        };
        setSelectedFile(fileWithSessionId);
        setCurrentView('documentation');
        // Update URL with fileId
        setSearchParams({ fileId: file.collection_name });
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
        // Update URL with fileId
        setSearchParams({ fileId: selectedFile.collection_name });
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