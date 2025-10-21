import React, { useState } from 'react';
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
    Tooltip
} from '@mui/material';
import {
    FileTextIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    PresentationChartIcon,
    LightbulbIcon,
    SparkleIcon,
    ArrowLeft
} from '@phosphor-icons/react';
import { analyzePowerBISection, parseImprovementRecommendations, applyImprovementRecommendation } from '../../services/powerbiDocsService';
import DocumentationSection from './components/DocumentationSection';
import CustomInstructionsModal from './components/CustomInstructionsModal';
import documentExportService from '../../services/documentExportService';

const DocumentationPage = ({ 
    selectedFile, 
    onBack, 
    showUploadSuccess, 
    successMessage 
}) => {
    const theme = useTheme();
    const [documentation, setDocumentation] = useState(null);
    const [parsedRecommendations, setParsedRecommendations] = useState([]);
    const [applyingRecommendation, setApplyingRecommendation] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [currentSectionForRegeneration, setCurrentSectionForRegeneration] = useState(null);
    const [customInstructions, setCustomInstructions] = useState('');
    const [editingSection, setEditingSection] = useState(null);
    const [editedContent, setEditedContent] = useState({});
    const [sectionLoading, setSectionLoading] = useState({});

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
        },
        { 
            id: 'improvement_recommendations', 
            title: 'Improvement Recommendations', 
            icon: <LightbulbIcon size={20} />, 
            description: 'Performance and optimization suggestions'
        }
    ];


    const handleApplyRecommendation = async (recommendationId) => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setApplyingRecommendation(recommendationId);
        setError(null);

        try {
            const result = await applyImprovementRecommendation(selectedFile.collection_name, recommendationId);
            
            if (result.success) {
                // Download the modified files
                if (result.download_data) {
                    const blob = new Blob([atob(result.download_data)], { type: 'application/zip' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.download_filename || 'modified_files.zip';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                
                // Show success message
                alert(`Recommendation applied successfully! ${result.message}\n\nChanges summary: ${result.changes_summary}`);
            } else {
                setError(`Failed to apply recommendation: ${result.message}`);
            }
            
        } catch (err) {
            setError(err.error || 'An error occurred while applying the recommendation');
            console.error('Error:', err);
        } finally {
            setApplyingRecommendation(null);
        }
    };

    const handleRegenerateClick = (sectionName) => {
        setCurrentSectionForRegeneration(sectionName);
        setCustomInstructions('');
        setShowInstructionsModal(true);
    };

    const handleGenerateSection = async (sectionId, customInstructions = '') => {
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

            // Special handling for improvement_recommendations - extract structured data
            if (sectionId === 'improvement_recommendations' && result.analysis && typeof result.analysis === 'object') {
                if (result.analysis.recommendations) {
                    setParsedRecommendations(result.analysis.recommendations);
                } else if (result.analysis.raw_text) {
                    // If backend returns structured format but parsing failed, try to parse again
                    try {
                        const parsedResult = await parseImprovementRecommendations(selectedFile.collection_name);
                        setParsedRecommendations(parsedResult.recommendations || []);
                    } catch (parseError) {
                        console.error('Error parsing recommendations:', parseError);
                        setParsedRecommendations([]);
                    }
                }
            }

        } catch (err) {
            setError(err.error || `An error occurred while generating ${sectionId.replace('_', ' ')}`);
            console.error('Error:', err);
        } finally {
            setSectionLoading(prev => ({ ...prev, [sectionId]: false }));
        }
    };

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
        
        try {
            await documentExportService.exportSection(sectionName, content, format, sectionTitle);
        } catch (error) {
            console.error('Export error:', error);
            setError(error.message);
        }
    };

    const handleEditContent = (sectionId) => {
        const currentContent = documentation?.documentation?.[sectionId] || '';
        setEditedContent(prev => ({ ...prev, [sectionId]: currentContent }));
        setEditingSection(sectionId);
    };

    const handleSaveEdit = (sectionId) => {
        // Update the documentation with edited content
        setDocumentation(prev => ({
            ...prev,
            documentation: {
                ...prev?.documentation,
                [sectionId]: editedContent[sectionId]
            }
        }));
        setEditingSection(null);
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
    };

    const handleContentChange = (sectionId, value) => {
        setEditedContent(prev => ({ ...prev, [sectionId]: value }));
    };

    const handleGenerateAll = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        // Start loading for all sections
        const loadingStates = {};
        sections.forEach(section => {
            loadingStates[section.id] = true;
        });
        setSectionLoading(loadingStates);
        setError(null);

        try {
            // Generate all sections in parallel
            const promises = sections.map(section => 
                analyzePowerBISection(selectedFile.collection_name, section.id, '')
            );
            
            const results = await Promise.all(promises);
            
            // Update documentation with all results
            const newDocumentation = {};
            results.forEach((result, index) => {
                newDocumentation[sections[index].id] = result.analysis;
            });
            
            setDocumentation(prev => ({
                ...prev,
                documentation: {
                    ...prev?.documentation,
                    ...newDocumentation
                }
            }));
            
            // Handle improvement recommendations parsing
            const improvementIndex = sections.findIndex(s => s.id === 'improvement_recommendations');
            if (improvementIndex !== -1 && results[improvementIndex]) {
                const result = results[improvementIndex];
                if (result.analysis && typeof result.analysis === 'object' && result.analysis.recommendations) {
                    // Backend already parsed the recommendations
                    setParsedRecommendations(result.analysis.recommendations);
                } else {
                    // Fallback to old parsing method
                    try {
                        const parsedResult = await parseImprovementRecommendations(selectedFile.collection_name);
                        setParsedRecommendations(parsedResult.recommendations || []);
                    } catch (parseError) {
                        console.error('Error parsing recommendations:', parseError);
                        setParsedRecommendations([]);
                    }
                }
            }
            
        } catch (err) {
            setError(err.error || 'An error occurred while generating documentation');
            console.error('Error:', err);
        } finally {
            // Clear loading states for all sections
            setSectionLoading({});
        }
    };

    return (
        <Fade in={true} timeout={800}>
            <Box sx={{ 
                px: { xs: 2, sm: 3, md: 4, lg: 6 }, 
                maxWidth: '100%',
                bgcolor: theme.palette.background.default,
                minHeight: '100vh'
            }}>
                {/* Header */}
                <Box 
                    sx={{ 
                        bgcolor: theme.palette.background.default,
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

                        {/* Action Button */}
                        <Button
                            onClick={handleGenerateAll}
                            disabled={Object.values(sectionLoading).some(loading => loading)}
                            variant="contained"
                            size="small"
                            startIcon={Object.values(sectionLoading).some(loading => loading) ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
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
                            {Object.values(sectionLoading).some(loading => loading) ? 'Generating...' : 'Generate All'}
                        </Button>
                    </Box>
                </Box>

                {/* Compact Tab Navigation */}
                <Paper 
                    sx={{ 
                        mb: 4, 
                        borderRadius: 2,
                        boxShadow: theme.shadows[1],
                        overflow: 'hidden',
                        bgcolor: theme.palette.background.paper
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTabs-indicator': {
                                height: 2,
                                borderRadius: '2px 2px 0 0'
                            },
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                minHeight: 56,
                                px: 1.5,
                                fontSize: '0.875rem',
                                color: 'inherit',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
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
                                    <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
                                        <Box sx={{ fontSize: '1rem' }}>
                                            {section.icon}
                                        </Box>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontWeight: 'inherit',
                                                fontSize: 'inherit',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
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

                {/* Active Section Content */}
                <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
                    {sections.map((section, index) => (
                        activeTab === index && (
                            <Box key={section.id}>
                                <DocumentationSection
                                    section={section}
                                    content={documentation?.documentation?.[section.id]}
                                    sectionLoading={sectionLoading}
                                    editingSection={editingSection}
                                    editedContent={editedContent}
                                    onEdit={handleEditContent}
                                    onSave={handleSaveEdit}
                                    onCancel={handleCancelEdit}
                                    onChange={handleContentChange}
                                    onRegenerate={handleRegenerateClick}
                                    onExport={handleExportSection}
                                    onGenerate={handleGenerateSection}
                                    parsedRecommendations={parsedRecommendations}
                                    applyingRecommendation={applyingRecommendation}
                                    onApplyRecommendation={handleApplyRecommendation}
                                    theme={theme}
                                />
                            </Box>
                        )
                    ))}
                </Box>

                <CustomInstructionsModal 
                    showModal={showInstructionsModal}
                    onClose={() => setShowInstructionsModal(false)}
                    currentSection={sections.find(s => s.id === currentSectionForRegeneration)}
                    customInstructions={customInstructions}
                    setCustomInstructions={setCustomInstructions}
                    onRegenerate={handleRegenerateWithInstructions}
                    isLoading={sectionLoading[currentSectionForRegeneration]}
                />
            </Box>
        </Fade>
    );
};

export default DocumentationPage;
