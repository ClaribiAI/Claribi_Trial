import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUploadedFiles } from '../services/powerbiChatService';

const FileContext = createContext();

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load files - only called once on mount or when explicitly refreshed
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const uploadedFiles = await getUploadedFiles();
      setFiles(uploadedFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      const errorMessage = err.message || 'Failed to load files';
      setError(errorMessage);
      // Don't show notification here - let the consuming components handle it if needed
    } finally {
      setLoading(false);
    }
  }, []);

  // Load files once on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Refresh files (called when a new file is uploaded)
  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  // Add a file to the list (optimistic update after upload)
  const addFile = useCallback((newFile) => {
    setFiles(prev => {
      // Check if file already exists to avoid duplicates
      const exists = prev.some(f => f.collection_name === newFile.collection_name);
      if (exists) {
        return prev;
      }
      return [newFile, ...prev];
    });
  }, []);

  // Remove a file from the list (when deleted)
  const removeFile = useCallback((deletedFile) => {
    setFiles(prev => prev.filter(f => f.collection_name !== deletedFile.collection_name));
  }, []);

  const value = {
    files,
    loading,
    error,
    refreshFiles,
    addFile,
    removeFile,
    loadFiles // Expose loadFiles in case manual refresh is needed
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};

export default FileContext;

