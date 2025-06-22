import { useState, useCallback, useRef } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import fileUploadService from '../../../services/fileUploadService';

const useFileUpload = (projectId, reportId, onUploadComplete) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const fileInputRef = useRef(null);
  const { showNotification } = useNotification();

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadFiles = useCallback(async (files, overwriteTables = null) => {
    try {
      setUploading(true);
      const response = await fileUploadService.uploadFiles(projectId, reportId, files, overwriteTables);
      
      if (response?.data?.success) {
        showNotification('Files uploaded successfully', 'success');
        if (onUploadComplete) {
          await onUploadComplete(false);
        }
        
        // Set hasUnsavedChanges to true to enable the Save button
        return true;
      } else {
        showNotification(response?.data?.error || 'Failed to upload files', 'error');
        return false;
      }
    } catch (err) {
      showNotification(`Error uploading files: ${err.message}`, 'error');
      return false;
    } finally {
      setUploading(false);
      setIsConflictModalOpen(false);
      setConflictInfo(null);
      setSelectedFiles(null);
      // Reset the file input if it exists
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  }, [projectId, reportId, onUploadComplete, showNotification]);

  const handleFileUpload = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setUploading(true);
      
      // First check for conflicts
      const conflictResponse = await fileUploadService.checkFileConflicts(projectId, reportId, files);
      
      if (conflictResponse?.data?.success) {
        if (conflictResponse.data.has_conflicts) {
          // Save files for later use and show conflict dialog
          setSelectedFiles(files);
          setConflictInfo(conflictResponse.data);
          setIsConflictModalOpen(true);
          setUploading(false);
          return;
        }
        
        // No conflicts, proceed with upload
        await uploadFiles(files);
      } else {
        showNotification(conflictResponse?.data?.error || 'Failed to check for conflicts', 'error');
        setUploading(false);
      }
    } catch (err) {
      showNotification(`Error checking for conflicts: ${err.message}`, 'error');
      setUploading(false);
      // Reset the file input
      event.target.value = null;
    }
  }, [projectId, reportId, uploadFiles, showNotification]);

  const handleConfirmOverwrite = useCallback(() => {
    if (selectedFiles) {
      // Upload with all conflicting tables set to overwrite
      uploadFiles(selectedFiles, conflictInfo?.conflicting_tables);
    }
  }, [selectedFiles, conflictInfo, uploadFiles]);

  const handleCancelOverwrite = useCallback(() => {
    setIsConflictModalOpen(false);
    setSelectedFiles(null);
    setConflictInfo(null);
    setUploading(false);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  }, []);

  return {
    uploading,
    fileInputRef,
    isConflictModalOpen,
    conflictInfo,
    handleUploadButtonClick,
    handleFileUpload,
    handleConfirmOverwrite,
    handleCancelOverwrite,
  };
};

export default useFileUpload; 