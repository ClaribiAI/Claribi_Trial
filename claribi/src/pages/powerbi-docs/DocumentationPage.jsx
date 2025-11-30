import React, { useState, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Fade,
    useTheme,
    alpha
} from '@mui/material';
import {
    FileTextIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    PresentationChartIcon,
    SparkleIcon,
    ArrowClockwiseIcon,
    DownloadIcon,
    PencilSimpleIcon
} from '@phosphor-icons/react';
import { analyzePowerBISection, getGeneratedDocs, rewriteDocumentationSection } from '../../services/powerbiDocsService';
import { reuploadPowerBIFile } from '../../services/powerbiChatService';
import { useNotification } from '../../contexts/NotificationContext';
import DocumentationSection from './components/DocumentationSection';
import CustomInstructionsModal from './components/CustomInstructionsModal';
import DocumentationHeader from './components/DocumentationHeader';
import SectionTabs from './components/SectionTabs';
import WarningAlert from './components/WarningAlert';
import SectionSelectionMenu from './components/SectionSelectionMenu';
import documentExportService from '../../services/documentExportService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DocumentationOnboardingTour from '../../components/onboarding/DocumentationOnboardingTour';
import { shouldShowDocumentationOnboarding, resetDocumentationOnboarding, dismissDocumentationOnboarding } from '../../services/onboardingService';

const DocumentationPage = ({ 
    selectedFile, 
    onBack, 
    showUploadSuccess, 
    successMessage 
}) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [documentation, setDocumentation] = useState(null);
    const [warning, setWarning] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [currentSectionForRegeneration, setCurrentSectionForRegeneration] = useState(null);
    const [customInstructions, setCustomInstructions] = useState('');
    // Editing functionality commented out
    // const [editingSection, setEditingSection] = useState(null);
    // const [editedContent, setEditedContent] = useState({});
    const [sectionLoading, setSectionLoading] = useState({});
    const [rewriteLoading, setRewriteLoading] = useState(false);
    // const [sectionSaving, setSectionSaving] = useState({});
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [allSectionsPreloaded, setAllSectionsPreloaded] = useState(false);
    
    // Section selection dropdown state
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);
    
    // Menu state for 3 dots
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const menuOpen = Boolean(menuAnchorEl);
    
    // Reupload state
    const [reuploadingFile, setReuploadingFile] = useState(false);
    const [reuploadProgress, setReuploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    
    // PDF formatting template state - stored in frontend only
    const [formattingPDF, setFormattingPDF] = useState(null); // Stores { file: File, filename: string }
    const pdfInputRef = useRef(null);

    // Onboarding tour state
    const [showOnboardingTour, setShowOnboardingTour] = useState(false);
    const [currentTourStep, setCurrentTourStep] = useState(0);
    const onboardingDismissedRef = useRef(false); // Track if onboarding was explicitly dismissed
    
    // Refs for tour target elements
    const generateAllButtonRef = useRef(null);
    const sectionTabsRef = useRef(null);
    const generateButtonRef = useRef(null);
    const regenerateButtonRef = useRef(null);
    const exportButtonRef = useRef(null);
    const contentAreaRef = useRef(null);
    const menuButtonRef = useRef(null);

    // Define available sections with Phosphor icons matching sidebar style
    const sections = [
        { 
            id: 'executive_summary', 
            title: 'Executive Summary', 
            icon: <FileTextIcon size={20} />, 
            description: 'High-level overview and key insights'
        },
        { 
            id: 'data_model_analysis', 
            title: 'Data Model Analysis', 
            icon: <ChartBarIcon size={20} />, 
            description: 'Detailed analysis of data structure and relationships'
        },
        { 
            id: 'visualization_analysis', 
            title: 'Visualization Analysis', 
            icon: <PresentationChartIcon size={20} />, 
            description: 'Review of charts, graphs, and visual elements'
        },
        { 
            id: 'security_analysis', 
            title: 'Security Analysis', 
            icon: <ShieldCheckIcon size={20} />, 
            description: 'Security assessment and compliance review'
        }
    ];

    // Define onboarding tour steps
    const tourSteps = [
        {
            title: 'Welcome to Documentation',
            description: 'This is your documentation workspace. Here you can generate comprehensive documentation for your Power BI file, including executive summaries, data model analysis, visualizations, and security assessments.',
            icon: <FileTextIcon size={20} />,
            position: 'bottom-center',
            getTargetElement: () => null // Welcome step - no target
        },
        {
            title: 'Generate All Sections',
            description: 'Click the "Generate All" button to create documentation for all sections at once. This is the fastest way to get started!',
            icon: <SparkleIcon size={20} />,
            position: 'bottom-right',
            getTargetElement: () => generateAllButtonRef
        },
        {
            title: 'Navigate Between Sections',
            description: 'Use these tabs to switch between different documentation sections, each section providing unique insights into your Power BI file.',
            icon: <FileTextIcon size={20} />,
            position: 'bottom',
            getTargetElement: () => sectionTabsRef
        },
        {
            title: 'Regenerate Sections',
            description: 'After generating a section, you can regenerate it with custom instructions. Click the regenerate button to create a new version of the documentation with your specific requirements.',
            icon: <ArrowClockwiseIcon size={20} />,
            position: 'bottom-right',
            getTargetElement: () => regenerateButtonRef,
            skipIfNotFound: false // Show even if content doesn't exist (buttons will be visible during onboarding)
        },
        {
            title: 'Rewrite Text',
            description: 'Select any text in the generated documentation and a menu will appear. You can rewrite the selected text in different styles: concise, professional, or casual. This helps you customize specific parts of the documentation.',
            icon: <PencilSimpleIcon size={20} />,
            position: 'center',
            getTargetElement: () => contentAreaRef,
            skipIfNotFound: false, // Always show this step
            noHighlight: true // Don't highlight anything, just show the tooltip
        },
        {
            title: 'Export Documentation',
            description: 'Export your documentation in multiple formats: HTML, Word (.docx), or PDF. Perfect for sharing with your team!',
            icon: <DownloadIcon size={20} />,
            position: 'bottom-right',
            getTargetElement: () => exportButtonRef,
            skipIfNotFound: false // Show even if content doesn't exist (buttons will be visible during onboarding)
        }
    ];

    // Tour navigation handlers
    const handleTourNext = () => {
        if (currentTourStep < tourSteps.length - 1) {
            // Check if next step should be skipped
            let nextStep = currentTourStep + 1;
            let skippedCount = 0;
            const maxSteps = tourSteps.length;
            
            while (nextStep < maxSteps && skippedCount < maxSteps) {
                const step = tourSteps[nextStep];
                // Don't skip steps with noHighlight flag - they don't need an element
                if (step.skipIfNotFound && !step.noHighlight) {
                    const targetElement = step.getTargetElement();
                    const element = targetElement?.current;
                    if (!element) {
                        // Skip this step and move to next
                        nextStep++;
                        skippedCount++;
                        continue;
                    }
                }
                break;
            }
            
            if (nextStep < tourSteps.length) {
                setCurrentTourStep(nextStep);
            } else {
                // All remaining steps were skipped, close tour and dismiss
                onboardingDismissedRef.current = true;
                dismissDocumentationOnboarding();
                setShowOnboardingTour(false);
            }
        } else {
            // Last step - close and dismiss
            handleTourClose();
        }
    };

    const handleTourBack = () => {
        if (currentTourStep > 0) {
            // Check if previous step should be skipped
            let prevStep = currentTourStep - 1;
            let skippedCount = 0;
            const maxSteps = tourSteps.length;
            
            while (prevStep >= 0 && skippedCount < maxSteps) {
                const step = tourSteps[prevStep];
                // Don't skip steps with noHighlight flag - they don't need an element
                if (step.skipIfNotFound && !step.noHighlight) {
                    const targetElement = step.getTargetElement();
                    const element = targetElement?.current;
                    if (!element) {
                        // Skip this step and move to previous
                        prevStep--;
                        skippedCount++;
                        continue;
                    }
                }
                break;
            }
            
            if (prevStep >= 0) {
                setCurrentTourStep(prevStep);
            } else {
                // All previous steps were skipped, go to first step
                setCurrentTourStep(0);
            }
        }
    };

    const handleTourClose = () => {
        // Set ref FIRST to prevent useEffect from reopening
        onboardingDismissedRef.current = true;
        // Dismiss onboarding when closed to prevent it from reopening
        dismissDocumentationOnboarding();
        // Then close the tour
        setShowOnboardingTour(false);
    };

    const handleTourSkip = () => {
        setShowOnboardingTour(false);
        // Dismiss onboarding when skipped to prevent it from reopening
        dismissDocumentationOnboarding();
        onboardingDismissedRef.current = true;
    };

    // Handler to retrigger onboarding tour
    const handleRetriggerOnboarding = () => {
        resetDocumentationOnboarding();
        onboardingDismissedRef.current = false; // Reset the dismissed flag
        setCurrentTourStep(0);
        setShowOnboardingTour(true);
    };

    const handleRegenerateClick = useCallback((sectionName) => {
        setCurrentSectionForRegeneration(sectionName);
        setCustomInstructions('');
        setShowInstructionsModal(true);
    }, []);

    const handleGenerateSection = useCallback(async (sectionId, customInstructions = '') => {
        if (!selectedFile) {
            showNotification('Please select a file first', 'error');
            return;
        }

        setSectionLoading(prev => ({ ...prev, [sectionId]: true }));
        setWarning(null);

        try {
            // Send PDF file with generation request if available
            const pdfFile = formattingPDF?.file || null;
            const result = await analyzePowerBISection(selectedFile.collection_name, sectionId, customInstructions, pdfFile);
            
            // Check for warning in response
            if (result && result.warning && result.warning.type === 'approaching_limit') {
                setWarning(result.warning.message || 'You are approaching your usage limit.');
            }
            
            // Update documentation with the result
            setDocumentation(prev => ({
                ...prev,
                documentation: {
                    ...prev?.documentation,
                    [sectionId]: result.analysis
                }
            }));

        } catch (err) {
            // Handle usage limit exceeded errors with user-friendly messages
            if (err.error === 'usage_limit_exceeded') {
                // Always use the message property, which contains the friendly message
                const friendlyMessage = err.message || 'You have reached your usage limit. Please upgrade your plan to continue generating documentation.';
                showNotification(friendlyMessage, 'error');
            } else {
                // For other errors, prefer message over error property
                showNotification(err.message || (typeof err === 'string' ? err : err.error) || `An error occurred while generating ${sectionId.replace('_', ' ')}`, 'error');
            }
            console.error('Error:', err);
        } finally {
            setSectionLoading(prev => ({ ...prev, [sectionId]: false }));
        }
    }, [selectedFile]);

    const handleRegenerateWithInstructions = () => {
        if (currentSectionForRegeneration) {
            handleGenerateSection(currentSectionForRegeneration, customInstructions);
            setShowInstructionsModal(false);
            setCurrentSectionForRegeneration(null);
            setCustomInstructions('');
        }
    };

    const handleExportSection = async (sectionName, content, format = 'html') => {
        const section = sections.find(s => s.id === sectionName);
        const sectionTitle = section ? section.title : sectionName;
        const pbixFileName = selectedFile?.filename || '';
        
        try {
            await documentExportService.exportSection(sectionName, content, format, sectionTitle, pbixFileName);
        } catch (error) {
            console.error('Export error:', error);
            showNotification(error.message, 'error');
        }
    };

    const handleRewriteSection = useCallback(async (sectionId, selectedText, startPosition, endPosition, rewriteStyle, onComplete) => {
        if (!selectedFile?.collection_name) {
            showNotification('Please select a file first', 'error');
            if (onComplete) onComplete();
            return;
        }

        setRewriteLoading(true);

        try {
            const result = await rewriteDocumentationSection(
                selectedFile.collection_name,
                sectionId,
                selectedText,
                startPosition,
                endPosition,
                rewriteStyle
            );
            
            // Update documentation with the rewritten content
            // Use functional update to ensure we're working with latest state
            setDocumentation(prev => {
                // Create a new object to ensure React detects the change
                const updated = {
                    ...prev,
                    documentation: {
                        ...prev?.documentation,
                        [sectionId]: result.updated_content
                    }
                };
                return updated;
            });

            const styleLabels = {
                concise: 'Concise',
                professional: 'Professional',
                casual: 'Casual'
            };

            showNotification(`Text rewritten in ${styleLabels[rewriteStyle] || rewriteStyle} style`, 'success');
            
            // Small delay to ensure state update and DOM re-render complete
            // This ensures the next selection uses the latest content
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.error('Error rewriting section:', err);
            const errorMessage = err.message || err.error || 'Failed to rewrite text. Please try again.';
            showNotification(errorMessage, 'error');
        } finally {
            setRewriteLoading(false);
            // Close menu after backend responds
            if (onComplete) {
                onComplete();
            }
        }
    }, [selectedFile, showNotification]);

    // Editing functionality commented out
    // const handleEditContent = useCallback((sectionId) => {
    //     const currentContent = documentation?.documentation?.[sectionId] || '';
    //     setEditedContent(prev => ({ ...prev, [sectionId]: currentContent }));
    //     setEditingSection(sectionId);
    // }, [documentation]);

    // const handleSaveEdit = useCallback(async (sectionId) => {
    //     if (!selectedFile?.collection_name) {
    //         setError('Please select a file first');
    //         return;
    //     }

    //     const content = editedContent[sectionId];
    //     if (!content) {
    //         setError('No content to save');
    //         return;
    //     }

    //     setSectionSaving(prev => ({ ...prev, [sectionId]: true }));
    //     setError(null);

    //     try {
    //         // Call backend API to update the documentation section
    //         await updateDocumentationSection(selectedFile.collection_name, sectionId, content);
    //         
    //         // Update the documentation with edited content
    //         setDocumentation(prev => ({
    //             ...prev,
    //             documentation: {
    //                 ...prev?.documentation,
    //                 [sectionId]: content
    //             }
    //         }));
    //         
    //         setEditingSection(null);
    //     } catch (err) {
    //         console.error('Error saving documentation section:', err);
    //         setError(err.error || err.message || 'Failed to save documentation section. Please try again.');
    //     } finally {
    //         setSectionSaving(prev => ({ ...prev, [sectionId]: false }));
    //     }
    // }, [editedContent, selectedFile]);

    // const handleCancelEdit = useCallback(() => {
    //     setEditingSection(null);
    // }, []);

    // const handleContentChange = useCallback((sectionId, value) => {
    //     setEditedContent(prev => ({ ...prev, [sectionId]: value }));
    // }, []);

    const handleTabChange = useCallback((event, newValue) => {
        setActiveTab(newValue);
    }, []);

    // Initialize selected sections with all sections when component mounts
    React.useEffect(() => {
        setSelectedSections(sections.map(section => section.id));
    }, []);

    // Load existing generated docs when selectedFile changes
    React.useEffect(() => {
        const loadExistingDocs = async () => {
            if (!selectedFile?.collection_name) {
                setInitialLoadComplete(true);
                setAllSectionsPreloaded(true);
                return;
            }

            setInitialLoadComplete(false);
            setAllSectionsPreloaded(false);

            try {
                const response = await getGeneratedDocs(selectedFile.collection_name);
                const generatedSections = response.generated_sections || {};

                if (Object.keys(generatedSections).length > 0) {
                    // Convert the response format to match our documentation state
                    const docsState = {};
                    Object.entries(generatedSections).forEach(([sectionName, sectionData]) => {
                        // Handle the new JSONB format where content is wrapped in an object
                        if (sectionData.content && typeof sectionData.content === 'object') {
                            if (sectionData.content.content) {
                                // New format: {content: "text", type: "text"}
                                docsState[sectionName] = sectionData.content.content;
                            } else {
                                // Direct object format (like improvement_recommendations)
                                docsState[sectionName] = sectionData.content;
                            }
                        } else {
                            // Fallback for old format or direct string
                            docsState[sectionName] = sectionData.content;
                        }
                    });

                    setDocumentation(prev => ({
                        ...prev,
                        documentation: {
                            ...prev?.documentation,
                            ...docsState
                        }
                    }));

                }
            } catch (err) {
                console.error('Error loading existing docs:', err);
                // Don't set error state for this - just log it silently
                // The user can still generate new docs
            } finally {
                setInitialLoadComplete(true);
                setAllSectionsPreloaded(true);
            }
        };

        loadExistingDocs();
    }, [selectedFile?.collection_name]);

    // Reset PDF state when file changes (frontend-only storage, no cleanup needed)
    React.useEffect(() => {
        setFormattingPDF(null);
    }, [selectedFile?.collection_name]);

    // Check if onboarding tour should be shown when file is selected and initial load is complete
    React.useEffect(() => {
        if (selectedFile && initialLoadComplete && shouldShowDocumentationOnboarding() && !showOnboardingTour && !onboardingDismissedRef.current) {
            // Small delay to ensure DOM is ready and elements are mounted
            const timer = setTimeout(() => {
                // Double-check that onboarding should still be shown (user might have dismissed it)
                if (shouldShowDocumentationOnboarding() && !onboardingDismissedRef.current) {
                    setShowOnboardingTour(true);
                    setCurrentTourStep(0);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [selectedFile, initialLoadComplete, showOnboardingTour]);

    const handlePDFInputChange = (event) => {
        const file = event.target.files[0];
        if (!file || !selectedFile) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', 'error');
            return;
        }

        // Validate file size (20MB limit)
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification('PDF file must be less than 20MB', 'error');
            return;
        }

        // Store PDF file in frontend state (no backend upload needed)
        setFormattingPDF({
            file: file,
            filename: file.name
        });
        showNotification('PDF formatting template selected. It will be used when generating documentation.', 'success');
        
        // Reset input to allow selecting the same file again
        if (pdfInputRef.current) {
            pdfInputRef.current.value = '';
        }
    };

    const handlePDFRemove = () => {
        setFormattingPDF(null);
        showNotification('PDF formatting template removed', 'success');
    };

    const handleGenerateAllClick = (event) => {
        if (!selectedFile) {
            showNotification('Please select a file first', 'error');
            return;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleDropdownClose = () => {
        setAnchorEl(null);
    };

    // Handle 3 dots menu
    const handleMenuOpen = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    // Handle reupload file
    const handleReuploadFile = () => {
        if (!selectedFile) return;
        handleMenuClose();
        // Trigger file input
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileInputChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedFile) return;

        // Validate file
        if (!file.name.toLowerCase().endsWith('.pbix')) {
            showNotification('Please select a valid .pbix file', 'error');
            return;
        }

        setReuploadingFile(true);
        setReuploadProgress(0);

        try {
            const collectionName = selectedFile.collection_name;
            if (!collectionName) {
                throw new Error('Collection name not found');
            }

            await reuploadPowerBIFile(collectionName, file, (progress) => {
                setReuploadProgress(progress);
            });

            showNotification(`File "${selectedFile.filename}" reuploaded successfully!`, 'success');
            
            // Optionally refresh file data - parent component should handle this
        } catch (err) {
            console.error('Error reuploading file:', err);
            showNotification(`Failed to reupload "${selectedFile.filename}". ${err.message || 'Please try again.'}`, 'error');
        } finally {
            setReuploadingFile(false);
            setReuploadProgress(0);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSectionToggle = (sectionId) => {
        setSelectedSections(prev => 
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };


    const handleGenerateSelected = async () => {
        if (!selectedFile) {
            showNotification('Please select a file first', 'error');
            return;
        }

        if (selectedSections.length === 0) {
            showNotification('Please select at least one section to generate', 'error');
            return;
        }

        // Filter sections based on selection
        const sectionsToGenerate = sections.filter(section => selectedSections.includes(section.id));

        // Start loading for selected sections
        const loadingStates = {};
        sectionsToGenerate.forEach(section => {
            loadingStates[section.id] = true;
        });
        setSectionLoading(loadingStates);
        setAnchorEl(null);

        // Generate selected sections in parallel - send PDF file if available
        const pdfFile = formattingPDF?.file || null;
        
        // Create promises for all sections and handle each one individually
        // This allows progressive updates as each section completes
        const promises = sectionsToGenerate.map(section => 
            analyzePowerBISection(selectedFile.collection_name, section.id, '', pdfFile)
                .then(result => {
                    // Update documentation immediately when this section completes
                    setDocumentation(prev => ({
                        ...prev,
                        documentation: {
                            ...prev?.documentation,
                            [section.id]: result.analysis
                        }
                    }));
                    
                    // Check for warnings
                    if (result && result.warning && result.warning.type === 'approaching_limit') {
                        setWarning(result.warning.message || 'You are approaching your usage limit.');
                    }
                    
                    // Clear loading state for this specific section
                    setSectionLoading(prev => ({
                        ...prev,
                        [section.id]: false
                    }));
                    
                    return { section, result };
                })
                .catch(err => {
                    // Handle errors per section so one failure doesn't block others
                    console.error(`Error generating ${section.id}:`, err);
                    
                    // Handle usage limit exceeded errors with user-friendly messages
                    if (err.error === 'usage_limit_exceeded') {
                        const friendlyMessage = err.message || 'You have reached your usage limit. Please upgrade your plan to continue generating documentation.';
                        showNotification(friendlyMessage, 'error');
                    } else {
                        // For other errors, show a section-specific error
                        const errorMessage = err.message || (typeof err === 'string' ? err : err.error) || `An error occurred while generating ${section.title}`;
                        showNotification(errorMessage, 'error');
                    }
                    
                    // Clear loading state for this specific section even on error
                    setSectionLoading(prev => ({
                        ...prev,
                        [section.id]: false
                    }));
                    
                    return { section, error: err };
                })
        );
        
        // Wait for all promises to settle (both success and failure)
        // This ensures we don't exit early if some sections fail
        await Promise.allSettled(promises);
    };

    // Show loading spinner for the entire page until initial load is complete
    if (!initialLoadComplete) {
        return (
            <Box sx={{ 
                display: 'flex',
                height: '100vh',
                bgcolor: theme.palette.background.chat,
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <LoadingSpinner size={60} />
            </Box>
        );
    }

    return (
        <Fade in={true} timeout={800}>
            <Box sx={{ 
                display: 'flex',
                height: '100vh',
                bgcolor: theme.palette.background.chat,
                position: 'relative'
            }}>
                {/* Hidden file input for reupload */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pbix"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />

                {/* Hidden file input for PDF upload */}
                <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={handlePDFInputChange}
                />

                {/* Loading overlay for reupload */}
                {reuploadingFile && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            gap: 2
                        }}
                    >
                        <LoadingSpinner size={60} />
                        <Typography variant="body1" sx={{ color: theme.palette.text.primary }}>
                            Reuploading file... {reuploadProgress > 0 && `${reuploadProgress}%`}
                        </Typography>
                    </Box>
                )}

                {/* Main Documentation Area */}
                <Box sx={{ 
                    flex: 1,
                    width: '100%',
                    bgcolor: theme.palette.background.chat,
                    minHeight: '100vh',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {/* Header */}
                    <DocumentationHeader
                        selectedFile={selectedFile}
                        onBack={onBack}
                        onGenerateAllClick={handleGenerateAllClick}
                        onRetriggerOnboarding={handleRetriggerOnboarding}
                        onMenuOpen={handleMenuOpen}
                        onReuploadFile={handleReuploadFile}
                        sectionLoading={sectionLoading}
                        reuploadingFile={reuploadingFile}
                        generateAllButtonRef={generateAllButtonRef}
                        menuButtonRef={menuButtonRef}
                        menuAnchorEl={menuAnchorEl}
                        menuOpen={menuOpen}
                        onMenuClose={handleMenuClose}
                    />

                    {/* Warning Alert */}
                    <WarningAlert 
                        warning={warning} 
                                onClose={() => setWarning(null)}
                    />

                {/* Main Content Area with padding */}
                <Box sx={{ px: 4, py: 4, flexGrow: 1 }}>
                        {/* Section Tabs */}
                        <SectionTabs
                            sections={sections}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            sectionTabsRef={sectionTabsRef}
                        />

                {/* Pre-rendered Section Content for Fast Switching */}
                <Box sx={{ maxWidth: '100%', overflow: 'visible' }}>
                    {sections.map((section, index) => (
                        <Box 
                            key={section.id}
                            sx={{ 
                                display: activeTab === index ? 'block' : 'none',
                                minHeight: '400px', // Prevent layout shift
                                opacity: allSectionsPreloaded ? 1 : 0.7,
                                transition: 'opacity 0.2s ease-in-out',
                                overflow: 'visible'
                            }}
                        >
                            <DocumentationSection
                                section={section}
                                content={documentation?.documentation?.[section.id]}
                                sectionLoading={sectionLoading}
                                // Editing functionality commented out
                                // sectionSaving={sectionSaving}
                                // editingSection={editingSection}
                                // editedContent={editedContent}
                                // onEdit={handleEditContent}
                                // onSave={handleSaveEdit}
                                // onCancel={handleCancelEdit}
                                // onChange={handleContentChange}
                                onRegenerate={handleRegenerateClick}
                                onExport={handleExportSection}
                                onGenerate={handleGenerateSection}
                                onRewrite={handleRewriteSection}
                                rewriteLoading={rewriteLoading}
                                theme={theme}
                                formattingPDF={formattingPDF}
                                onPDFInputChange={handlePDFInputChange}
                                onPDFRemove={handlePDFRemove}
                                pdfInputRef={pdfInputRef}
                                tourRefs={activeTab === index ? {
                                    generateButton: generateButtonRef,
                                    regenerateButton: regenerateButtonRef,
                                    exportButton: exportButtonRef,
                                    contentArea: contentAreaRef
                                } : undefined}
                                isOnboardingActive={showOnboardingTour}
                            />
                        </Box>
                    ))}
                </Box>
                </Box>
                </Box>

                <CustomInstructionsModal
                    showModal={showInstructionsModal}
                    onClose={() => setShowInstructionsModal(false)}
                    currentSection={sections.find(s => s.id === currentSectionForRegeneration)}
                    customInstructions={customInstructions}
                    setCustomInstructions={setCustomInstructions}
                    onRegenerate={handleRegenerateWithInstructions}
                    isLoading={sectionLoading[currentSectionForRegeneration]}
                    formattingPDF={formattingPDF}
                    onPDFInputChange={handlePDFInputChange}
                    onPDFRemove={handlePDFRemove}
                    pdfInputRef={pdfInputRef}
                />

                {/* Documentation Onboarding Tour */}
                {showOnboardingTour && (
                    <DocumentationOnboardingTour
                        open={showOnboardingTour}
                        onClose={handleTourClose}
                        steps={tourSteps}
                        currentStepIndex={currentTourStep}
                        onNext={handleTourNext}
                        onBack={handleTourBack}
                        onSkip={handleTourSkip}
                        targetElement={tourSteps[currentTourStep]?.getTargetElement?.()}
                    />
                )}

                {/* Section Selection Dropdown Menu */}
                <SectionSelectionMenu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleDropdownClose}
                    sections={sections}
                    selectedSections={selectedSections}
                    onSectionToggle={handleSectionToggle}
                    onGenerateSelected={handleGenerateSelected}
                    sectionLoading={sectionLoading}
                    formattingPDF={formattingPDF}
                    onPDFInputChange={handlePDFInputChange}
                    onPDFRemove={handlePDFRemove}
                    pdfInputRef={pdfInputRef}
                    selectedFile={selectedFile}
                    theme={theme}
                />
            </Box>
        </Fade>
    );
};

export default DocumentationPage;