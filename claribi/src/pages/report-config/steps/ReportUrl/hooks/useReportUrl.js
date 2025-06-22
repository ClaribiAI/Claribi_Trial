import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../../../../../contexts/NotificationContext';
import reportConfigService from '../../../../../../services/reportConfigService';

const useReportUrl = (projectId, reportId) => {
  const [loadingData, setLoadingData] = useState(true);
  const [url, setUrl] = useState('');
  const [editedUrl, setEditedUrl] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const { showNotification } = useNotification();

  const fetchReportUrl = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await reportConfigService.getReportConfig(projectId, reportId);
      
      if (response.data?.success !== false) {
        const reportUrl = response.data?.url || '';
        setUrl(reportUrl);
        setEditedUrl(reportUrl);
      } else {
        showNotification('error', 'Failed to load report URL');
      }
    } catch (error) {
      console.error('Error fetching report URL:', error);
      showNotification('error', 'Failed to load report URL');
    } finally {
      setLoadingData(false);
    }
  }, [projectId, reportId, showNotification]);

  useEffect(() => {
    fetchReportUrl();
  }, [fetchReportUrl]);

  const handleUrlChange = useCallback((event) => {
    const newUrl = event.target.value;
    setEditedUrl(newUrl);
    setIsEdited(newUrl !== url);
  }, [url]);

  const handleSaveUrl = useCallback(async () => {
    try {
      await reportConfigService.saveReportUrl(projectId, reportId, editedUrl);
      setUrl(editedUrl);
      setIsEdited(false);
      showNotification('success', 'Report URL saved successfully');
    } catch (error) {
      console.error('Error saving report URL:', error);
      showNotification('error', 'Failed to save report URL');
    }
  }, [projectId, reportId, editedUrl, showNotification]);

  const handleCopyUrl = useCallback(() => {
    try {
      navigator.clipboard.writeText(url);
      showNotification('success', 'URL copied to clipboard');
    } catch (error) {
      console.error('Error copying URL:', error);
      showNotification('error', 'Failed to copy URL');
    }
  }, [url, showNotification]);

  const handleOpenUrl = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  return {
    loadingData,
    url,
    editedUrl,
    isEdited,
    handleUrlChange,
    handleSaveUrl,
    handleCopyUrl,
    handleOpenUrl,
  };
};

export default useReportUrl; 