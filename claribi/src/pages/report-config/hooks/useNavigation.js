import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';

const useNavigation = (hasUnsavedChanges, onSave, onDiscardChanges, hasData, hasSelectedFields) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Check if a step is disabled
  const isStepDisabled = useCallback((step) => {
    if (step === 0) return false; // Field Selection is always enabled
    if (!hasData) return true; // If no data, all subsequent steps are disabled
    if (!hasSelectedFields) return true; // If no fields selected, all subsequent steps are disabled
    return false;
  }, [hasData, hasSelectedFields]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        handleNavigationWithUnsavedCheck(() => navigate(-1));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, navigate]);

  const handleNavigationWithUnsavedCheck = useCallback((navigationAction) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigationAction);
      setIsUnsavedModalOpen(true);
    } else {
      navigationAction();
    }
  }, [hasUnsavedChanges]);

  const handleBackToProject = useCallback(() => {
    handleNavigationWithUnsavedCheck(() => {
      navigate(-1);
    });
  }, [navigate, handleNavigationWithUnsavedCheck]);

  const handleStepChange = useCallback((step) => {
    // Prevent navigation to disabled steps
    if (isStepDisabled(step)) {
      showNotification('Please upload data and select fields in the Field Selection step first', 'warning');
      return;
    }

    handleNavigationWithUnsavedCheck(() => {
      setActiveStep(step);
    });
  }, [handleNavigationWithUnsavedCheck, isStepDisabled, showNotification]);

  const handleNextStep = useCallback(() => {
    const nextStep = activeStep + 1;
    // Prevent navigation to disabled steps
    if (isStepDisabled(nextStep)) {
      showNotification('Please upload data and select fields in the Field Selection step first', 'warning');
      return;
    }

    handleNavigationWithUnsavedCheck(() => {
      setActiveStep(prev => Math.min(prev + 1, 3));
    });
  }, [handleNavigationWithUnsavedCheck, activeStep, isStepDisabled, showNotification]);

  const handlePreviousStep = useCallback(() => {
    handleNavigationWithUnsavedCheck(() => {
      setActiveStep(prev => Math.max(prev - 1, 0));
    });
  }, [handleNavigationWithUnsavedCheck]);

  const handleSaveAndProceed = useCallback(async () => {
    if (!onSave) {
      showNotification('error', 'Save function not provided');
      return;
    }

    try {
      setSaving(true);
      await onSave();
      
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
      setIsUnsavedModalOpen(false);
    } catch (error) {
      console.error('Error during save:', error);
      showNotification('error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [pendingNavigation, onSave, showNotification]);

  const handleProceedWithoutSaving = useCallback(() => {
    if (onDiscardChanges) {
      onDiscardChanges();
    }
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    setIsUnsavedModalOpen(false);
  }, [pendingNavigation, onDiscardChanges]);

  const handleCancel = useCallback(() => {
    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  }, []);

  return {
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
  };
};

export default useNavigation; 