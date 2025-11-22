import React, { useState, useMemo, useCallback, memo } from 'react';
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
    ListItemText
} from '@mui/material';
import {
    FileTextIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    PresentationChartIcon,
    SparkleIcon,
    ArrowLeft,
    CaretDownIcon
} from '@phosphor-icons/react';
import { analyzePowerBISection, getGeneratedDocs /*, updateDocumentationSection */ } from '../../services/powerbiDocsService';
import DocumentationSection from './components/DocumentationSection';
import CustomInstructionsModal from './components/CustomInstructionsModal';
import documentExportService from '../../services/documentExportService';
import ChatPage from '../powerbi-chat/ChatPage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DocumentationPage = ({ 
    selectedFile, 
    onBack, 
    showUploadSuccess, 
    successMessage 
}) => {
    const theme = useTheme();
    const [documentation, setDocumentation] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [currentSectionForRegeneration, setCurrentSectionForRegeneration] = useState(null);
    const [customInstructions, setCustomInstructions] = useState('');
    // Editing functionality commented out
    // const [editingSection, setEditingSection] = useState(null);
    // const [editedContent, setEditedContent] = useState({});
    const [sectionLoading, setSectionLoading] = useState({});
    // const [sectionSaving, setSectionSaving] = useState({});
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [allSectionsPreloaded, setAllSectionsPreloaded] = useState(false);
    
    // Section selection dropdown state
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);
    
    // Chat interface state
    const [showChat, setShowChat] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState('');
    const [chatWidth, setChatWidth] = useState(50); // Percentage of viewport width
    const [isDragging, setIsDragging] = useState(false);

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


    const handleCloseChat = () => {
        setShowChat(false);
        setChatInitialMessage('');
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

        try {
            const result = await analyzePowerBISection(selectedFile.collection_name, sectionId, customInstructions);
            
            // Update documentation with the result
            setDocumentation(prev => ({
                ...prev,
                documentation: {
                    ...prev?.documentation,
                    [sectionId]: result.analysis
                }
            }));

        } catch (err) {
            setError(err.error || `An error occurred while generating ${sectionId.replace('_', ' ')}`);
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

        try {
            // Generate selected sections in parallel
            const promises = sectionsToGenerate.map(section => 
                analyzePowerBISection(selectedFile.collection_name, section.id, '')
            );
            
            const results = await Promise.all(promises);
            
            // Update documentation with all results
            const newDocumentation = {};
            results.forEach((result, index) => {
                newDocumentation[sectionsToGenerate[index].id] = result.analysis;
            });
            
            setDocumentation(prev => ({
                ...prev,
                documentation: {
                    ...prev?.documentation,
                    ...newDocumentation
                }
            }));
            
            
        } catch (err) {
            setError(err.error || 'An error occurred while generating documentation');
            console.error('Error:', err);
        } finally {
            // Clear loading states for all sections
            setSectionLoading({});
        }
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
                bgcolor: theme.palette.background.chat
            }}>
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
                        px: 3,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
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
                    </Box>
                </Box>

                {/* Main Content Area with padding */}
                <Box sx={{ px: 4, py: 4, flexGrow: 1 }}>
                {/* Compact Tab Navigation */}
                <Paper 
                    sx={{ 
                        mb: 4, 
                        borderRadius: 2,
                        boxShadow: theme.shadows[1],
                        overflow: showChat ? 'visible' : 'hidden',
                        bgcolor: theme.palette.background.paper
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
                                theme={theme}
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
                />

                {/* Section Selection Dropdown Menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleDropdownClose}
                    PaperProps={{
                        sx: {
                            minWidth: 300,
                            maxHeight: 500,
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
                    </Box>
                </Menu>
            </Box>
        </Fade>
    );
};

export default DocumentationPage;