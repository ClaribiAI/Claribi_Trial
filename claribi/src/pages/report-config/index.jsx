import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Paper } from '@mui/material';
import Header from './components/Header';
import StepNavigation from './components/StepNavigation';
import FieldSelection from './steps/FieldSelection';
import SynonymManagement from './steps/SynonymManagement';
import ReportUrl from './steps/ReportUrl';
import QueryAssistant from './steps/QueryAssistant';
import UnsavedChangesModal from './components/UnsavedChangesModal';
import ConflictModal from './components/ConflictModal';
import useReportConfig from './hooks/useReportConfig';
import useFileUpload from './hooks/useFileUpload';
import useNavigation from './hooks/useNavigation';
import reportConfigService from '../../services/reportConfigService';
import { useNotification } from '../../contexts/NotificationContext';

const ReportConfigPage = () => {
  const { projectId, reportId } = useParams();
  const { showNotification } = useNotification();

  const {
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
    config
  } = useReportConfig(projectId, reportId);

  const handleSaveSelection = async () => {
    try {
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
        showNotification('Field selections saved successfully', 'success');
        setHasUnsavedChanges(false);
      } else {
        showNotification(response?.data?.error || 'Failed to save field selections', 'error');
        throw new Error(response?.data?.error || 'Failed to save field selections');
      }
    } catch (err) {
      showNotification(`Error saving field selections: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDiscardChanges = async () => {
    try {
      // Refresh the configuration data without preserving unsaved changes
      await fetchConfigData(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      showNotification(`Error resetting changes: ${err.message}`, 'error');
    }
  };

  const {
    uploading,
    fileInputRef,
    isConflictModalOpen,
    conflictInfo,
    handleUploadButtonClick,
    handleFileUpload,
    handleConfirmOverwrite,
    handleCancelOverwrite,
  } = useFileUpload(projectId, reportId, fetchConfigData);

  const {
    activeStep,
    isUnsavedModalOpen,
    saving,
    handleBackToProject,
    handleStepChange,
    handleNextStep,
    handlePreviousStep,
    handleSaveAndProceed,
    handleProceedWithoutSaving,
    handleCancel,
  } = useNavigation(hasUnsavedChanges, handleSaveSelection, handleDiscardChanges);

  const handleDeleteTable = async (tableName) => {
    try {
      const response = await reportConfigService.deleteTable(projectId, reportId, tableName);
      
      if (response?.data?.success) {
        showNotification('Table deleted successfully', 'success');
        // Refresh the data to update the UI
        await fetchConfigData(false);
      } else {
        showNotification(response?.data?.error || 'Failed to delete table', 'error');
      }
    } catch (err) {
      showNotification(`Error deleting table: ${err.message}`, 'error');
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <FieldSelection
            projectId={projectId}
            reportId={reportId}
            hasData={hasData}
            tableData={tableData}
            setTableData={setTableData}
            setHasUnsavedChanges={setHasUnsavedChanges}
            loading={loadingData}
            onUploadClick={handleUploadButtonClick}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
            uploading={uploading}
            onDeleteTable={handleDeleteTable}
            onSaveSelection={handleSaveSelection}
            saving={saving}
          />
        );
      case 1:
        return (
          <SynonymManagement
            projectId={projectId}
            reportId={reportId}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        );
      case 2:
        return (
          <ReportUrl
            projectId={projectId}
            reportId={reportId}
            config={config}
            setHasUnsavedChanges={setHasUnsavedChanges}
            onNextStep={handleNextStep}
            fetchConfigData={fetchConfigData}
          />
        );
      case 3:
        return (
          <QueryAssistant
            projectId={projectId}
            reportId={reportId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth={false} sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Header
        project={project}
        report={report}
        loading={loadingData}
        onBackClick={handleBackToProject}
      />
      
      <Box sx={{ mt: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <StepNavigation
          activeStep={activeStep}
          onStepChange={handleStepChange}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
        />
        
        <Box sx={{ flex: 1, mt: 3, minHeight: 0 }}>
          {renderStep()}
        </Box>
      </Box>

      <UnsavedChangesModal
        open={isUnsavedModalOpen}
        onSaveAndProceed={handleSaveAndProceed}
        onProceedWithoutSaving={handleProceedWithoutSaving}
        onCancel={handleCancel}
        saving={saving}
      />

      <ConflictModal
        open={isConflictModalOpen}
        conflictInfo={conflictInfo}
        onConfirm={handleConfirmOverwrite}
        onCancel={handleCancelOverwrite}
      />
    </Container>
  );
};

export default ReportConfigPage; 