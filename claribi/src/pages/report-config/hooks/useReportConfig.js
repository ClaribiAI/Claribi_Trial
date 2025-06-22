import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import reportService from '../../../services/reportService';
import reportConfigService from '../../../services/reportConfigService';
import projectService from '../../../services/projectService';

const useReportConfig = (projectId, reportId) => {
  // Core state
  const [project, setProject] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [config, setConfig] = useState(null);
  const { showNotification } = useNotification();
  
  // Use ref to store current tableData to avoid dependency cycle
  const tableDataRef = useRef(tableData);
  useEffect(() => {
    tableDataRef.current = tableData;
  }, [tableData]);

  // Fetch config data with option to preserve unsaved changes
  const fetchConfigData = useCallback(async (preserveUnsavedChanges = false) => {
    if (!projectId || !reportId) return;
    
    try {
      setLoadingData(true);
      const response = await reportConfigService.getReportConfig(projectId, reportId);
      
      if (response?.data?.success) {
        setConfig(response.data.config);
        
        // Process tables and fields data
        if (response.data.config?.tables_info) {
          const tables = [];
          
          // Process tables_info into tableData format
          Object.entries(response.data.config.tables_info).forEach(([tableName, tableInfo]) => {
            // Process regular columns (dimensions)
            Object.entries(tableInfo.columns || {}).forEach(([columnName, dataType]) => {
              tables.push({
                id: `${tableName}-${columnName}`,
                table: tableName,
                columnName: columnName,
                dataType: typeof dataType === 'string' ? dataType : 'string',
                measure: false,
                selected: response.data.config.selected_fields?.[tableName]?.includes(columnName) || false
              });
            });
            
            // Process measures array if it exists
            if (tableInfo.measures && Array.isArray(tableInfo.measures)) {
              tableInfo.measures.forEach((measureName) => {
                tables.push({
                  id: `${tableName}-${measureName}-measure`,
                  table: tableName,
                  columnName: measureName,
                  dataType: 'number',
                  measure: true,
                  selected: response.data.config.selected_fields?.[tableName]?.includes(measureName) || false
                });
              });
            }
          });
          
          let finalTables = tables;
          
          // If we need to preserve unsaved changes, merge with current tableData
          if (preserveUnsavedChanges && tableDataRef.current.length > 0) {
            finalTables = tables.map(newTable => {
              const existingTable = tableDataRef.current.find(t => t.id === newTable.id);
              return existingTable || newTable;
            });
          }
          
          setTableData(finalTables);
          if (!preserveUnsavedChanges) {
            setOriginalTableData(finalTables);
          }
          
          // Set hasData to true if we have any tables
          setHasData(Object.keys(response.data.config.tables_info).length > 0);
        } else {
          setHasData(false);
        }
      } else {
        showNotification('Failed to fetch configuration data', 'error');
        setHasData(false);
      }
    } catch (err) {
      showNotification(`Error fetching configuration data: ${err.message}`, 'error');
      setHasData(false);
    } finally {
      setLoadingData(false);
    }
  }, [projectId, reportId, showNotification]); // Removed tableData from dependencies

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!projectId || !reportId) return;

    try {
      setLoadingData(true);
      
      // Use projectService instead of reportService for project data
      const projectData = await projectService.getProject(projectId);
      if (!projectData) {
        showNotification('Failed to fetch project data', 'error');
        return;
      }
      setProject(projectData);
      
      // Fetch report data
      const reportResponse = await reportService.getReport(projectId, reportId);
      if (!reportResponse?.data?.success) {
        showNotification('Failed to fetch report data', 'error');
        return;
      }
      setReport(reportResponse.data.report);
      
      // Fetch configuration data
      await fetchConfigData();
    } catch (error) {
      console.error('Error fetching report config:', error);
      showNotification('Failed to load report configuration', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [projectId, reportId, showNotification, fetchConfigData]);

  // Initial data fetch with cleanup
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const loadData = async () => {
      if (!projectId || !reportId) return;
      
      // Add a small delay to prevent rapid refetches
      timeoutId = setTimeout(async () => {
        if (!mounted) return;
        await fetchData();
      }, 100);
    };

    loadData();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchData]);

  return {
    project,
    report,
    loadingData,
    hasData,
    hasUnsavedChanges,
    tableData,
    setTableData,
    setHasUnsavedChanges,
    fetchData,
    fetchConfigData,
    config,
  };
};

export default useReportConfig; 