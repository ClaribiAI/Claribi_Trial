import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../../../../../contexts/NotificationContext';
import reportConfigService from '../../../../../../services/reportConfigService';

const useSynonymManagement = (projectId, reportId, tableData) => {
  const [loadingData, setLoadingData] = useState(true);
  const [synonymsData, setSynonymsData] = useState({});
  const [editingSynonyms, setEditingSynonyms] = useState(false);
  const { showNotification } = useNotification();

  const fetchSynonyms = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await reportConfigService.getSynonyms(projectId, reportId);
      
      // Transform the data into the required format
      const transformedData = {};
      Object.entries(tableData).forEach(([tableName, fields]) => {
        transformedData[tableName] = fields.map(field => ({
          column: field.name,
          synonyms: response[tableName]?.[field.name] || [],
          newSynonym: ''
        }));
      });

      setSynonymsData(transformedData);
      setEditingSynonyms(false);
    } catch (error) {
      showNotification('error', 'Failed to load synonyms');
      console.error('Error fetching synonyms:', error);
    } finally {
      setLoadingData(false);
    }
  }, [projectId, reportId, tableData, showNotification]);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  const handleAddSynonym = useCallback((tableName, column) => {
    setSynonymsData(prevData => {
      const newData = { ...prevData };
      const field = newData[tableName].find(f => f.column === column);
      
      if (field && field.newSynonym?.trim()) {
        const synonym = field.newSynonym.trim();
        if (!field.synonyms.includes(synonym)) {
          field.synonyms.push(synonym);
          field.newSynonym = '';
          setEditingSynonyms(true);
        }
      }
      
      return newData;
    });
  }, []);

  const handleRemoveSynonym = useCallback((tableName, column, index) => {
    setSynonymsData(prevData => {
      const newData = { ...prevData };
      const field = newData[tableName].find(f => f.column === column);
      
      if (field) {
        field.synonyms.splice(index, 1);
        setEditingSynonyms(true);
      }
      
      return newData;
    });
  }, []);

  const handleSynonymChange = useCallback((tableName, column, value) => {
    setSynonymsData(prevData => {
      const newData = { ...prevData };
      const field = newData[tableName].find(f => f.column === column);
      
      if (field) {
        field.newSynonym = value;
      }
      
      return newData;
    });
  }, []);

  const handleSaveSynonyms = useCallback(async () => {
    try {
      const synonymsToSave = {};
      Object.entries(synonymsData).forEach(([tableName, fields]) => {
        synonymsToSave[tableName] = {};
        fields.forEach(field => {
          if (field.synonyms.length > 0) {
            synonymsToSave[tableName][field.column] = field.synonyms;
          }
        });
      });

      await reportConfigService.saveSynonyms(projectId, reportId, synonymsToSave);
      showNotification('success', 'Synonyms saved successfully');
      setEditingSynonyms(false);
    } catch (error) {
      showNotification('error', 'Failed to save synonyms');
      console.error('Error saving synonyms:', error);
    }
  }, [projectId, reportId, synonymsData, showNotification]);

  return {
    loadingData,
    synonymsData,
    editingSynonyms,
    handleAddSynonym,
    handleRemoveSynonym,
    handleSynonymChange,
    handleSaveSynonyms,
  };
};

export default useSynonymManagement; 