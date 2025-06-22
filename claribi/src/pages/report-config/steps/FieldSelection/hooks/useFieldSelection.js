import { useState, useCallback } from 'react';
import { useNotification } from '../../../../../contexts/NotificationContext';
import reportConfigService from '../../../../../services/reportConfigService';

const useFieldSelection = (projectId, reportId, tableData, setTableData, setHasUnsavedChanges) => {
  const { showNotification } = useNotification();
  const [loadingData, setLoadingData] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeTableMenu, setActiveTableMenu] = useState({ section: '', tableName: '' });
  const [isDeleteTableModalOpen, setIsDeleteTableModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);

  const handleToggleSelect = useCallback((id) => {
    setTableData(prevData => {
      const newData = prevData.map(row => 
        row.id === id ? { ...row, selected: !row.selected } : row
      );
      setHasUnsavedChanges(true);
      return newData;
    });
  }, [setTableData, setHasUnsavedChanges]);

  const handleSelectAll = useCallback(() => {
    setTableData(prevData => {
      const newData = prevData.map(row => ({ ...row, selected: true }));
      setHasUnsavedChanges(true);
      return newData;
    });
  }, [setTableData, setHasUnsavedChanges]);

  const handleDeselectAll = useCallback(() => {
    setTableData(prevData => {
      const newData = prevData.map(row => ({ ...row, selected: false }));
      setHasUnsavedChanges(true);
      return newData;
    });
  }, [setTableData, setHasUnsavedChanges]);

  const handleSaveSelection = async () => {
    try {
      setLoadingData(true);
      
      // Transform tableData into the format expected by the API
      const selectedFields = {};
      tableData.filter(row => row.selected).forEach(row => {
        if (!selectedFields[row.table]) {
          selectedFields[row.table] = [];
        }
        selectedFields[row.table].push(row.columnName);
      });
      
      const response = await reportConfigService.saveFieldSelections(projectId, reportId, selectedFields);
      
      if (response?.data?.success) {
        showNotification('success', 'Field selections saved successfully');
        setHasUnsavedChanges(false);
      } else {
        showNotification('error', response?.data?.error || 'Failed to save field selections');
      }
    } catch (err) {
      showNotification('error', `Error saving field selections: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const handleTableMenuOpen = (event, section, tableName) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveTableMenu({ section, tableName });
  };

  const handleTableMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteTable = () => {
    setTableToDelete(activeTableMenu);
    setIsDeleteTableModalOpen(true);
    handleTableMenuClose();
  };

  const handleConfirmDeleteTable = async () => {
    try {
      setLoadingData(true);
      
      const response = await reportConfigService.deleteTable(
        projectId, 
        reportId, 
        tableToDelete.tableName
      );
      
      if (response?.data?.success) {
        showNotification('Table deleted successfully', 'success');
        // Remove the deleted table from tableData
        setTableData(prevData => 
          prevData.filter(row => row.table !== tableToDelete.tableName)
        );
      } else {
        showNotification(response?.data?.error || 'Failed to delete table', 'error');
      }
    } catch (err) {
      showNotification(`Error deleting table: ${err.message}`, 'error');
    } finally {
      setLoadingData(false);
      setIsDeleteTableModalOpen(false);
      setTableToDelete(null);
    }
  };

  return {
    loadingData,
    expandedTables,
    menuAnchorEl,
    activeTableMenu,
    isDeleteTableModalOpen,
    tableToDelete,
    setExpandedTables,
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll,
    handleSaveSelection,
    handleTableMenuOpen,
    handleTableMenuClose,
    handleDeleteTable,
    handleConfirmDeleteTable,
  };
};

export default useFieldSelection; 