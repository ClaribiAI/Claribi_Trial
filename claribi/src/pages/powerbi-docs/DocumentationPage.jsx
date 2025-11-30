import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Tabs,
    Tab,
    Fade,
    CircularProgress,
    useTheme,
    alpha,
    Tooltip,
    Menu,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Divider,
    ListItemIcon,
    ListItemText,
    Alert,
    Link
} from '@mui/material';
import {
    FileTextIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    PresentationChartIcon,
    SparkleIcon,
    ArrowLeft,
    CaretDownIcon,
    DotsThreeVertical,
    CloudArrowUp,
    FilePdf,
    X,
    Question,
    ArrowClockwiseIcon,
    DownloadIcon,
    PencilSimpleIcon
} from '@phosphor-icons/react';
import { analyzePowerBISection, getGeneratedDocs, rewriteDocumentationSection /*, updateDocumentationSection */ } from '../../services/powerbiDocsService';
import { reuploadPowerBIFile } from '../../services/powerbiChatService';
import { useNotification } from '../../contexts/NotificationContext';
import DocumentationSection from './components/DocumentationSection';
import CustomInstructionsModal from './components/CustomInstructionsModal';
import documentExportService from '../../services/documentExportService';
import ChatPage from '../powerbi-chat/ChatPage';
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
    const [error, setError] = useState(null);
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
    
    // Chat interface state
    const [showChat, setShowChat] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState('');
    const [chatWidth, setChatWidth] = useState(50); // Percentage of viewport width
    const [isDragging, setIsDragging] = useState(false);

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


    const handleCloseChat = () => {
        setShowChat(false);
        setChatInitialMessage('');
    };

    // Helper function to render message with clickable links
    const renderMessageWithLinks = (message) => {
        if (!message) return message;
        
        // Convert to string if it's not already a string
        const messageStr = typeof message === 'string' ? message : String(message);
        
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = messageStr.split(urlRegex);
        
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                // Extract display text (remove https://)
                const displayText = part.replace(/^https?:\/\//, '');
                return (
                    <Link
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            color: 'inherit',
                            textDecoration: 'underline',
                            fontWeight: 500,
                            '&:hover': {
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        {displayText}
                    </Link>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    // Drag functionality for resizing chat window
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const containerWidth = window.innerWidth;
        const newChatWidth = ((containerWidth - e.clientX) / containerWidth) * 100;
        
        // Constrain chat width between 20% and 60%
        const constrainedWidth = Math.min(Math.max(newChatWidth, 20), 60);
        setChatWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add event listeners for drag functionality
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const handleRegenerateClick = useCallback((sectionName) => {
        setCurrentSectionForRegeneration(sectionName);
        setCustomInstructions('');
        setShowInstructionsModal(true);
    }, []);

    const handleGenerateSection = useCallback(async (sectionId, customInstructions = '') => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setSectionLoading(prev => ({ ...prev, [sectionId]: true }));
        setError(null);
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
                setError(friendlyMessage);
            } else {
                // For other errors, prefer message over error property
                setError(err.message || (typeof err === 'string' ? err : err.error) || `An error occurred while generating ${sectionId.replace('_', ' ')}`);
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
            setError(error.message);
        }
    };

    const handleRewriteSection = useCallback(async (sectionId, selectedText, startPosition, endPosition, rewriteStyle, onComplete) => {
        if (!selectedFile?.collection_name) {
            showNotification('Please select a file first', 'error');
            if (onComplete) onComplete();
            return;
        }

        setRewriteLoading(true);
        setError(null);

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
            setError(null);

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
            setError('Please select a file first');
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
            setError('Please select a file first');
            return;
        }

        if (selectedSections.length === 0) {
            setError('Please select at least one section to generate');
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
        setError(null);
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
                        setError(friendlyMessage);
                    } else {
                        // For other errors, show a section-specific error
                        const errorMessage = err.message || (typeof err === 'string' ? err : err.error) || `An error occurred while generating ${section.title}`;
                        setError(errorMessage);
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
                    flex: showChat ? 1 : 1,
                    width: showChat ? `${100 - chatWidth}%` : '100%',
                    bgcolor: theme.palette.background.chat,
                    minHeight: '100vh',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {/* Header */}
                <Box 
                    sx={{ 
                        bgcolor: theme.palette.sidebar.background,
                        py: 1.5,
                        px: 3
                    }}
                >
                    <Box display="flex" alignItems="center" gap={2}>
                        {/* Back Button */}
                        <Tooltip title="Back to file management">
                            <Button
                                onClick={onBack}
                                sx={{
                                    minWidth: 'auto',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'transparent',
                                    color: theme.palette.text.secondary,
                                    p: 0,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <ArrowLeft size={20} />
                            </Button>
                        </Tooltip>
                        
                        {/* File Name */}
                        <Typography variant="h6" component="h1" sx={{ 
                            fontWeight: 600, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {selectedFile?.filename}
                        </Typography>

                        {/* Action Button with Dropdown */}
                        <Button
                            ref={generateAllButtonRef}
                            onClick={handleGenerateAllClick}
                            disabled={Object.values(sectionLoading).some(isLoading => isLoading)}
                            variant="contained"
                            size="small"
                            endIcon={Object.values(sectionLoading).some(isLoading => isLoading) ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <CaretDownIcon size={16} color={theme.palette.primary.contrastText} />}
                            sx={{ 
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                fontFamily: "'Nunito Sans', sans-serif",
                                fontWeight: 500,
                                textTransform: 'none',
                                borderRadius: 2,
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark,
                                    color: theme.palette.primary.contrastText
                                },
                                '&:disabled': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.3)
                                }
                            }}
                        >
                            {Object.values(sectionLoading).some(isLoading => isLoading) ? 'Generating...' : 'Generate All'}
                        </Button>

                        {/* Help/Onboarding Button */}
                        <Tooltip title="Need help?">
                            <Button
                                onClick={handleRetriggerOnboarding}
                                sx={{
                                    minWidth: 'auto',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'transparent',
                                    color: theme.palette.text.secondary,
                                    p: 0,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Question size={20} />
                            </Button>
                        </Tooltip>

                        {/* 3 Dots Menu Button */}
                        <Tooltip title="More options">
                            <Button
                                ref={menuButtonRef}
                                onClick={handleMenuOpen}
                                sx={{
                                    minWidth: 'auto',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'transparent',
                                    color: theme.palette.text.secondary,
                                    p: 0,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <DotsThreeVertical size={20} />
                            </Button>
                        </Tooltip>

                        {/* 3 Dots Menu */}
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={menuOpen}
                            onClose={handleMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    minWidth: 200,
                                    borderRadius: 2,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }
                            }}
                        >
                            <MenuItem 
                                onClick={handleReuploadFile}
                                disabled={reuploadingFile || !selectedFile}
                            >
                                <ListItemIcon>
                                    {reuploadingFile ? (
                                        <CircularProgress size={20} />
                                    ) : (
                                        <CloudArrowUp size={20} />
                                    )}
                                </ListItemIcon>
                                <ListItemText>
                                    {reuploadingFile ? 'Reuploading...' : 'Reupload file'}
                                </ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>

                    {/* Warning and Error Alerts */}
                    {(warning || error) && (
                        <Box sx={{ px: 4, pt: 2 }}>
                            {warning && (
                                <Alert 
                                    severity="warning" 
                                    onClose={() => setWarning(null)}
                                    sx={{ mb: error ? 2 : 0, borderRadius: 2 }}
                                >
                                    {renderMessageWithLinks(warning)}
                                </Alert>
                            )}
                            {error && (
                                <Alert 
                                    severity="error" 
                                    onClose={() => setError(null)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {renderMessageWithLinks(error)}
                                </Alert>
                            )}
                        </Box>
                    )}

                {/* Main Content Area with padding */}
                <Box sx={{ px: 4, py: 4, flexGrow: 1 }}>
                {/* Compact Tab Navigation */}
                <Paper 
                    ref={sectionTabsRef}
                    sx={{ 
                        mb: 4, 
                        borderRadius: 2,
                        boxShadow: theme.shadows[1],
                        overflow: showChat ? 'visible' : 'hidden',
                        bgcolor: theme.palette.background.paper,
                        position: 'relative',
                        zIndex: 1 // Low z-index to ensure it doesn't interfere with onboarding
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant={showChat ? "standard" : "fullWidth"}
                        sx={{
                            '& .MuiTabs-indicator': {
                                height: 2,
                                borderRadius: '2px 2px 0 0'
                            },
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                minHeight: showChat ? 80 : 56,
                                px: showChat ? 0.5 : 1.5,
                                fontSize: showChat ? '0.75rem' : '0.875rem',
                                color: 'inherit',
                                minWidth: showChat ? 120 : 0,
                                flex: showChat ? '1 1 auto' : 1,
                                maxWidth: showChat ? 'none' : 'none',
                                flexDirection: showChat ? 'column' : 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: showChat ? 0.5 : 0,
                                '&:hover': {
                                    backgroundColor: theme.palette.background.hover
                                },
                                '&.Mui-selected': {
                                    fontWeight: 600,
                                    color: 'inherit'
                                }
                            }
                        }}
                    >
                        {sections.map((section, index) => (
                            <Tab
                                key={section.id}
                                label={
                                    <Box 
                                        display="flex" 
                                        alignItems="center" 
                                        gap={showChat ? 0.5 : 0.5} 
                                        sx={{ 
                                            minWidth: 0,
                                            flexDirection: showChat ? 'column' : 'row',
                                            justifyContent: 'center',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Box sx={{ fontSize: '1rem' }}>
                                            {section.icon}
                                        </Box>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontWeight: 'inherit',
                                                fontSize: 'inherit',
                                                whiteSpace: showChat ? 'normal' : 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                lineHeight: showChat ? 1.2 : 'inherit',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {section.title}
                                        </Typography>
                                    </Box>
                                }
                            />
                        ))}
                    </Tabs>
                </Paper>

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

                {/* Chat Interface - Slide in from right */}
                {showChat && (
                    <>
                        {/* Resize Handle - Invisible */}
                        <Box
                            onMouseDown={handleMouseDown}
                            sx={{
                                width: 8,
                                height: '100vh',
                                cursor: 'col-resize',
                                position: 'relative',
                                '&:hover': {
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 2,
                                        height: 40,
                                        bgcolor: theme.palette.primary.main,
                                        borderRadius: 1,
                                        opacity: 0.7
                                    }
                                }
                            }}
                        />
                        
                        {/* Chat Area */}
                        <Box sx={{ 
                            width: `${chatWidth}%`,
                            height: '100vh',
                            bgcolor: theme.palette.background.paper
                        }}>
                            <ChatPage
                                pbixFile={selectedFile}
                                onBack={onBack}
                                isNewlyUploaded={false}
                                initialMessage={chatInitialMessage}
                                onCloseChat={handleCloseChat}
                                isInline={true}
                            />
                        </Box>
                    </>
                )}

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
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleDropdownClose}
                    PaperProps={{
                        sx: {
                            minWidth: 300,
                            maxHeight: formattingPDF ? 600 : 500,
                            borderRadius: 2,
                            boxShadow: theme.shadows[8],
                            mt: 1
                        }
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    {/* Header */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Select Sections to Generate
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Choose which documentation sections you'd like to generate
                        </Typography>
                    </Box>


                    {/* Section List */}
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {sections.map((section, index) => (
                            <MenuItem
                                key={section.id}
                                onClick={() => handleSectionToggle(section.id)}
                                sx={{
                                    py: 1,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.04)
                                    }
                                }}
                            >
                                <Checkbox
                                    checked={selectedSections.includes(section.id)}
                                    sx={{
                                        p: 0.5,
                                        '&.Mui-checked': {
                                            color: theme.palette.primary.main
                                        }
                                    }}
                                />
                                <ListItemIcon sx={{ minWidth: 32, color: selectedSections.includes(section.id) ? theme.palette.primary.main : theme.palette.text.secondary }}>
                                    {section.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={section.title}
                                    secondary={section.description}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        fontWeight: selectedSections.includes(section.id) ? 500 : 400
                                    }}
                                    secondaryTypographyProps={{
                                        variant: 'caption',
                                        color: 'text.secondary'
                                    }}
                                />
                            </MenuItem>
                        ))}
                    </Box>

                    <Divider />

                    {/* Generate Button */}
                    <Box sx={{ p: 2 }}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleGenerateSelected}
                            disabled={selectedSections.length === 0 || Object.values(sectionLoading).some(isLoading => isLoading)}
                            startIcon={Object.values(sectionLoading).some(isLoading => isLoading) ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
                            sx={{
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                borderRadius: 2,
                                mb: 1.5,
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark,
                                    color: theme.palette.primary.contrastText
                                },
                                '&:disabled': {
                                    bgcolor: theme.palette.action.disabledBackground
                                }
                            }}
                        >
                            {Object.values(sectionLoading).some(isLoading => isLoading) ? 'Generating...' : `Generate ${selectedSections.length} Section${selectedSections.length !== 1 ? 's' : ''}`}
                        </Button>

                        {/* PDF Upload Option */}
                        <Divider sx={{ my: 1.5 }} />
                        
                        {/* PDF Status Display */}
                        {formattingPDF && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 1.5,
                                    py: 1,
                                    mb: 1,
                                    borderRadius: 1.5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                    <FilePdf size={18} color={theme.palette.primary.main} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {formattingPDF.filename}
                                    </Typography>
                                </Box>
                                <Tooltip title="Remove PDF template">
                                    <Button
                                        onClick={handlePDFRemove}
                                        size="small"
                                        sx={{
                                            minWidth: 'auto',
                                            width: 24,
                                            height: 24,
                                            p: 0,
                                            color: theme.palette.text.secondary,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                                color: theme.palette.error.main
                                            }
                                        }}
                                    >
                                        <X size={14} />
                                    </Button>
                                </Tooltip>
                            </Box>
                        )}

                        {/* PDF Upload Button */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: formattingPDF ? 0.5 : 0 }}>
                            <Button
                                fullWidth
                                variant={formattingPDF ? "outlined" : "outlined"}
                                onClick={() => pdfInputRef.current?.click()}
                                disabled={!selectedFile}
                                startIcon={<FilePdf size={16} />}
                                sx={{
                                    borderColor: formattingPDF ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.text.secondary, 0.3),
                                    color: formattingPDF ? theme.palette.primary.main : theme.palette.text.secondary,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    flex: 1,
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        color: theme.palette.primary.main
                                    },
                                    '&:disabled': {
                                        borderColor: theme.palette.action.disabledBackground,
                                        color: theme.palette.action.disabled
                                    }
                                }}
                            >
                                {formattingPDF 
                                    ? 'Replace Style Reference' 
                                    : 'Use PDF as Style Reference'}
                            </Button>
                            <Tooltip 
                                title={
                                    <Box sx={{ p: 0.5 }}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            Upload a PDF document to use as a formatting template. The generated documentation will match the style, tone, language, and structure of your PDF example.
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                            The PDF is only used during generation and is not stored permanently.
                                        </Typography>
                                    </Box>
                                }
                                arrow
                                placement="top"
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                        color: theme.palette.text.secondary,
                                        cursor: 'help',
                                        flexShrink: 0,
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main
                                        }
                                    }}
                                >
                                    <Question size={14} weight="fill" />
                                </Box>
                            </Tooltip>
                        </Box>
                        <input
                            ref={pdfInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handlePDFInputChange}
                            style={{ display: 'none' }}
                        />
                        {formattingPDF && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                                Documentation will match the style of: {formattingPDF.filename}
                            </Typography>
                        )}
                    </Box>
                </Menu>
            </Box>
        </Fade>
    );
};

export default DocumentationPage;