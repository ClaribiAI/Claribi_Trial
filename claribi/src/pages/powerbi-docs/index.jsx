import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { 
    Box, 
    Typography, 
    Button, 
    Chip, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tabs,
    Tab,
    Paper,
    Card,
    CardContent,
    CardHeader,
    CardActions,
    IconButton,
    Tooltip,
    Fade,
    Slide,
    LinearProgress,
    Alert,
    AlertTitle,
    Backdrop,
    CircularProgress,
    Grid,
    Divider,
    useTheme,
    alpha,
    Snackbar
} from '@mui/material';
import {
    CloudArrowUpIcon,
    FileTextIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    PresentationChartIcon,
    LightbulbIcon,
    ArrowClockwiseIcon,
    DownloadIcon,
    GearSixIcon,
    CheckCircleIcon,
    WarningIcon,
    XCircleIcon,
    InfoIcon,
    XIcon,
    UploadIcon,
    SparkleIcon,
    PencilSimpleIcon,
    FloppyDiskIcon,
    XCircleIcon as CancelIcon
} from '@phosphor-icons/react';
import { analyzePowerBIFiles, analyzePowerBISection, parseImprovementRecommendations, applyImprovementRecommendation } from '../../services/powerbiDocsService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Professional loading overlay with backdrop
const LoadingOverlay = ({ open, isDarkMode }) => (
    <Backdrop 
        open={open} 
        sx={{ 
            position: 'absolute', 
            zIndex: 20,
            backgroundColor: isDarkMode ? alpha('#000', 0.8) : alpha('#fff', 0.8),
            backdropFilter: 'blur(4px)'
        }}
    >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary">
                Generating content...
            </Typography>
        </Box>
    </Backdrop>
);

// Enhanced Custom Instructions Modal
const CustomInstructionsModal = ({ 
    showModal, 
    onClose, 
    currentSection, 
    customInstructions, 
    setCustomInstructions, 
    onRegenerate, 
    isLoading
}) => {
    const theme = useTheme();
    
    return (
        <Dialog 
            open={showModal} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[20]
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <ArrowClockwiseIcon size={20} color="currentColor" style={{ color: '#1976d2' }} />
                    <Typography variant="h6" component="span">
                        Regenerate {currentSection?.title}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Provide specific instructions on how you'd like to modify this section. For example: 
                    "Focus more on security best practices" or "Include specific metrics and KPIs".
                </Typography>
                <TextField
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter your custom instructions here... (optional)"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button 
                    onClick={onClose} 
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={16} /> : <SparkleIcon size={16} />}
                    sx={{ borderRadius: 2, minWidth: 120 }}
                >
                    {isLoading ? 'Generating...' : 'Regenerate'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Enhanced Recommendation Card with modern styling
const RecommendationCard = ({ recommendation, onApply, isApplying }) => {
    const theme = useTheme();
    
    const getPriorityConfig = (priority) => {
        switch (priority) {
            case 'high': 
                return { 
                    color: 'error', 
                    bgcolor: alpha(theme.palette.error.main, 0.1)
                };
            case 'medium': 
                return { 
                    color: 'warning', 
                    bgcolor: alpha(theme.palette.warning.main, 0.1)
                };
            case 'low': 
                return { 
                    color: 'success', 
                    bgcolor: alpha(theme.palette.success.main, 0.1)
                };
            default: 
                return { 
                    color: 'info', 
                    icon: <InfoIcon size={16} />,
                    bgcolor: alpha(theme.palette.info.main, 0.1)
                };
        }
    };

    const getComplexityConfig = (complexity) => {
        switch (complexity) {
            case 'high': return { color: 'secondary', label: 'Complex' };
            case 'medium': return { color: 'primary', label: 'Moderate' };
            case 'low': return { color: 'info', label: 'Simple' };
            default: return { color: 'default', label: complexity };
        }
    };

    const priorityConfig = getPriorityConfig(recommendation.priority);
    const complexityConfig = getComplexityConfig(recommendation.complexity);

    return (
        <Card 
            sx={{ 
                mb: 3, 
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                }
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {recommendation.title}
                    </Typography>
                    <Box display="flex" gap={1}>
                        <Chip 
                            icon={priorityConfig.icon}
                            label={`${recommendation.priority} priority`}
                            color={priorityConfig.color}
                            size="small"
                            variant="outlined"
                            sx={{ 
                                textTransform: 'capitalize',
                                bgcolor: priorityConfig.bgcolor
                            }}
                        />
                        <Chip 
                            label={`${complexityConfig.label} complexity`}
                            color={complexityConfig.color}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                </Box>
                
                <Box mb={2}>
                    <Chip 
                        label={recommendation.category}
                        variant="filled"
                        size="small"
                        sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            fontWeight: 500
                        }}
                    />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {recommendation.description}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {recommendation.applicable_files.map((file, index) => (
                            <Chip 
                                key={index}
                                label={file}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                    fontSize: '0.75rem',
                                    bgcolor: alpha(theme.palette.info.main, 0.05)
                                }}
                            />
                        ))}
                    </Box>
                    
                    <Button
                        onClick={() => onApply(recommendation.id)}
                        disabled={isApplying}
                        variant="contained"
                        size="small"
                        startIcon={isApplying ? <CircularProgress size={16} /> : <GearSixIcon size={16} />}
                        sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            minWidth: 140
                        }}
                    >
                        {isApplying ? 'Applying...' : 'Apply Fix'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

const PowerBIDocumentation = () => {
    const theme = useTheme();
    const { isDarkMode } = useCustomTheme();
    const [pbixFile, setPbixFile] = useState(null);
    const [sectionLoading, setSectionLoading] = useState({});
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
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);

    // Use ref for the file input to trigger it programmatically
    const pbixFileInput = useRef(null);

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file extension and MIME type
            const fileName = file.name.toLowerCase();
            const validExtensions = ['.pbix'];
            const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
            
            if (!hasValidExtension) {
                setError('Please select a valid .pbix file only');
                return;
            }
            
            // Additional validation for file size (optional - max 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxSize) {
                setError('File size must be less than 100MB');
                return;
            }
            
            setPbixFile(file);
            setError(null);
            
            // Show success popup briefly
            setShowUploadSuccess(true);
            setTimeout(() => {
                setShowUploadSuccess(false);
            }, 6000);
        }
    };



    const handleApplyRecommendation = async (recommendationId) => {
        if (!pbixFile) {
            setError('Please select a .pbix file first');
            return;
        }

        setApplyingRecommendation(recommendationId);
        setError(null);

        try {
            const result = await applyImprovementRecommendation(pbixFile, recommendationId);
            
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
        if (!pbixFile) {
            setError('Please select a .pbix file first');
            return;
        }

        setSectionLoading(prev => ({ ...prev, [sectionId]: true }));
        setError(null);

        try {
            const result = await analyzePowerBISection(pbixFile, sectionId, customInstructions);
            
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
                        const parsedResult = await parseImprovementRecommendations(pbixFile);
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

    const handleExportSection = (sectionName, content, format = 'html') => {
        if (!content) {
            setError('No content to export. Please generate the section first.');
            return;
        }

        const section = sections.find(s => s.id === sectionName);
        const sectionTitle = section ? section.title : sectionName;
        
        let fileContent, fileType, fileExtension;
        
        // Convert markdown to HTML first
        const htmlContent = content
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        if (format === 'word') {
            // Create RTF format for Word compatibility
            const rtfContent = content
                .replace(/^# (.+)$/gm, '{\\rtf1\\ansi\\b $1\\b0\\par}')
                .replace(/^## (.+)$/gm, '{\\fs28\\b $1\\b0\\par}')
                .replace(/^### (.+)$/gm, '{\\fs24\\b $1\\b0\\par}')
                .replace(/\*\*(.+?)\*\*/g, '{\\b $1\\b0}')
                .replace(/\*(.+?)\*/g, '{\\i $1\\i0}')
                .replace(/\n/g, '\\par ');
            
            fileContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${rtfContent}}`;
            fileType = 'application/rtf';
            fileExtension = 'rtf';
        } else if (format === 'pdf') {
            // Create HTML optimized for PDF printing
            fileContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${sectionTitle}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        h1 { 
            color: #333; 
            border-bottom: 2px solid #333; 
            padding-bottom: 10px;
            page-break-after: avoid;
        }
        h2 { 
            color: #666; 
            margin-top: 30px;
            page-break-after: avoid;
        }
        h3 { 
            color: #888;
            page-break-after: avoid;
        }
        p { margin-bottom: 15px; }
        code { 
            background-color: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        .print-instructions {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        @media print {
            .print-instructions { display: none; }
        }
    </style>
</head>
<body>
    <div class="print-instructions no-print">
        <strong>📄 To save as PDF:</strong> Press Ctrl+P (or Cmd+P on Mac) and select "Save as PDF"
    </div>
    <h1>${sectionTitle}</h1>
    <p>${htmlContent}</p>
</body>
</html>`;
            fileType = 'text/html';
            fileExtension = 'html';
        } else {
            // HTML format
            fileContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${sectionTitle}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        h1 { 
            color: #333; 
            border-bottom: 2px solid #333; 
            padding-bottom: 10px;
        }
        h2 { 
            color: #666; 
            margin-top: 30px;
        }
        h3 { color: #888; }
        p { margin-bottom: 15px; }
        code { 
            background-color: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        strong { color: #333; }
    </style>
</head>
<body>
    <h1>${sectionTitle}</h1>
    <p>${htmlContent}</p>
</body>
</html>`;
            fileType = 'text/html';
            fileExtension = 'html';
        }
        
        // Create download link
        const blob = new Blob([fileContent], { type: fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sectionTitle.replace(/\s+/g, '_')}_Documentation.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileSelect = () => {
        pbixFileInput.current?.click();
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
        if (!pbixFile) {
            setError('Please select a .pbix file first');
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
                analyzePowerBISection(pbixFile, section.id, '')
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
                        const parsedResult = await parseImprovementRecommendations(pbixFile);
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

    // Helper function to render a documentation section
    const renderDocumentationSection = (section, content) => (
        <Fade in={true} timeout={600}>
            <Card 
                sx={{ 
                    borderRadius: 3,
                    boxShadow: theme.shadows[3],
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: isDarkMode ? '#1E1E1E' : '#ffffff'
                }}
            >
                <CardHeader
                    avatar={
                        <Box 
                            sx={{ 
                                p: 1, 
                                borderRadius: 2, 
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main
                            }}
                        >
                            {section.icon}
                        </Box>
                    }
                    title={
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, color: isDarkMode ? '#FFFFFF' : 'inherit' }}>
                            {section.title}
                        </Typography>
                    }
                    subheader={
                        <Typography variant="body2" sx={{ color: isDarkMode ? '#E0E0E0' : 'text.secondary' }}>
                            {section.description}
                        </Typography>
                    }
                    action={
                        <Box display="flex" gap={1}>
                            {content && editingSection !== section.id && (
                                <>
                                    <Tooltip title="Edit content">
                                        <IconButton 
                                            onClick={() => handleEditContent(section.id)}
                                            size="small"
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <PencilSimpleIcon size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Regenerate section">
                                        <IconButton 
                                            onClick={() => handleRegenerateClick(section.id)}
                                            disabled={sectionLoading[section.id]}
                                            size="small"
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <ArrowClockwiseIcon size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <Select
                                            displayEmpty
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleExportSection(section.id, content, e.target.value);
                                                }
                                            }}
                                            renderValue={() => (
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <DownloadIcon size={16} />
                                                    <span>Export</span>
                                                </Box>
                                            )}
                                        >
                                            <MenuItem value="html">📝 HTML Document</MenuItem>
                                            <MenuItem value="word">📄 Word Document (.rtf)</MenuItem>
                                            <MenuItem value="pdf">📋 PDF Ready (.html)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </>
                            )}
                            {content && editingSection === section.id && (
                                <>
                                    <Tooltip title="Save changes">
                                        <IconButton 
                                            onClick={() => handleSaveEdit(section.id)}
                                            size="small"
                                            color="primary"
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <FloppyDiskIcon size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel editing">
                                        <IconButton 
                                            onClick={handleCancelEdit}
                                            size="small"
                                            color="secondary"
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <XIcon size={16} />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                            {!content && (
                                <Button
                                    onClick={() => handleGenerateSection(section.id)}
                                    disabled={sectionLoading[section.id] || !pbixFile}
                                    variant="contained"
                                    size="small"
                                    startIcon={sectionLoading[section.id] ? <CircularProgress size={16} /> : <SparkleIcon size={16} />}
                                    sx={{ 
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500
                                    }}
                                >
                                    {sectionLoading[section.id] ? 'Generating...' : 'Generate'}
                                </Button>
                            )}
                        </Box>
                    }
                    sx={{ pb: 1 }}
                />
                
                <CardContent sx={{ pt: 0, position: 'relative' }}>
                    <LoadingOverlay open={sectionLoading[section.id]} isDarkMode={isDarkMode} />
                    
                    {content ? (
                        <Box>
                            {/* Special handling for improvement recommendations */}
                            {section.id === 'improvement_recommendations' && parsedRecommendations.length > 0 ? (
                                <Box>
                                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                                        <AlertTitle>Interactive Recommendations</AlertTitle>
                                        Click "Apply Fix" to have AI modify your files with the specific improvement.
                                    </Alert>
                                    
                                    <Box mb={4}>
                                        {parsedRecommendations.map((rec) => (
                                            <RecommendationCard
                                                key={rec.id}
                                                recommendation={rec}
                                                onApply={handleApplyRecommendation}
                                                isApplying={applyingRecommendation === rec.id}
                                            />
                                        ))}
                                    </Box>
                                    
                                    {/* Show full recommendations text for improvement_recommendations */}
                                    <Box mb={2}>
                                        <Typography variant="h6" sx={{ mb: 2, color: isDarkMode ? '#FFFFFF' : 'text.primary' }}>
                                            Full Recommendations Text
                                        </Typography>
                                    </Box>
                                    
                                </Box>
                            ) : null}
                            
                            <Paper 
                                sx={{ 
                                    p: 3, 
                                    bgcolor: isDarkMode ? '#2A2A2A' : alpha(theme.palette.background.paper, 0.6),
                                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                    borderRadius: 2
                                }}
                            >
                                {editingSection === section.id ? (
                                    <TextField
                                        multiline
                                        fullWidth
                                        value={editedContent[section.id] || ''}
                                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                                        placeholder="Edit your content here..."
                                        minRows={15}
                                        maxRows={25}
                                        sx={{
                                            '& .MuiInputBase-root': {
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                lineHeight: 1.6,
                                                bgcolor: alpha(theme.palette.background.paper, 0.8)
                                            },
                                            '& .MuiInputBase-input': {
                                                resize: 'vertical'
                                            }
                                        }}
                                    />
                                ) : (
                                    <Box 
                                        sx={{
                                            '& h1': { 
                                                fontSize: '1.5rem', 
                                                fontWeight: 600, 
                                                color: isDarkMode ? '#FFFFFF' : 'text.primary',
                                                mt: 3,
                                                mb: 2,
                                                '&:first-of-type': { mt: 0 }
                                            },
                                            '& h2': { 
                                                fontSize: '1.25rem', 
                                                fontWeight: 600, 
                                                color: isDarkMode ? '#FFFFFF' : 'text.primary',
                                                mt: 3,
                                                mb: 2
                                            },
                                            '& h3': { 
                                                fontSize: '1.125rem', 
                                                fontWeight: 500, 
                                                color: isDarkMode ? '#FFFFFF' : 'text.primary',
                                                mt: 2,
                                                mb: 1
                                            },
                                            '& p': { 
                                                mb: 2, 
                                                lineHeight: 1.7,
                                                color: isDarkMode ? '#E0E0E0' : 'text.secondary'
                                            },
                                            '& ul, & ol': { 
                                                mb: 2, 
                                                pl: 3,
                                                '& li': { 
                                                    mb: 0.5, 
                                                    lineHeight: 1.6,
                                                    color: isDarkMode ? '#E0E0E0' : 'inherit'
                                                }
                                            },
                                            '& strong': { 
                                                fontWeight: 600, 
                                                color: isDarkMode ? '#FFFFFF' : 'text.primary'
                                            },
                                            '& code': { 
                                                bgcolor: isDarkMode ? alpha('#FCC000', 0.2) : alpha(theme.palette.primary.main, 0.1),
                                                color: isDarkMode ? '#FCC000' : 'primary.dark',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontSize: '0.875rem',
                                                fontFamily: 'monospace'
                                            },
                                            '& pre': { 
                                                bgcolor: isDarkMode ? '#1A1A1A' : alpha(theme.palette.grey[900], 0.05),
                                                p: 2, 
                                                borderRadius: 2, 
                                                overflow: 'auto',
                                                mb: 2,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                                color: isDarkMode ? '#E0E0E0' : 'inherit'
                                            },
                                            '& blockquote': { 
                                                borderLeft: `4px solid ${theme.palette.primary.main}`,
                                                pl: 2, 
                                                fontStyle: 'italic', 
                                                color: isDarkMode ? '#E0E0E0' : 'text.secondary',
                                                mb: 2,
                                                bgcolor: isDarkMode ? alpha('#FCC000', 0.05) : alpha(theme.palette.primary.main, 0.02),
                                                py: 1,
                                                borderRadius: '0 4px 4px 0'
                                            }
                                        }}
                                    >
                                        <ReactMarkdown>
                                            {section.id === 'improvement_recommendations' && typeof content === 'object' && content.raw_text 
                                                ? content.raw_text 
                                                : (typeof content === 'string' ? content : JSON.stringify(content, null, 2))
                                            }
                                        </ReactMarkdown>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    ) : (
                        <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center" 
                            justifyContent="center"
                            py={6}
                            sx={{ 
                                bgcolor: isDarkMode ? '#2A2A2A' : alpha(theme.palette.grey[50], 0.5),
                                borderRadius: 2,
                                border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`
                            }}
                        >
                            <Box sx={{ color: isDarkMode ? '#666666' : 'text.disabled', mb: 2 }}>
                                {section.icon}
                            </Box>
                            <Typography variant="body1" align="center" sx={{ mb: 2, color: isDarkMode ? '#E0E0E0' : 'text.secondary' }}>
                                Click "Generate" to create the {section.title.toLowerCase()} section
                            </Typography>
                            <Typography variant="body2" align="center" sx={{ color: isDarkMode ? '#B0B0B0' : 'text.disabled' }}>
                                {section.description}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Fade>
    );

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Compact Professional Header - Only show when file is uploaded */}
            {pbixFile && (
                <Box 
                    sx={{ 
                        bgcolor: 'transparent',
                        py: 2,
                        px: 0,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`
                    }}
                >
                    <Box width="100%" display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 0.5, color: isDarkMode ? '#FFFFFF' : '#333' }}>
                                ClaribiDocs
                            </Typography>
                            <Typography variant="body2" sx={{ color: isDarkMode ? '#E0E0E0' : '#666' }}>
                                AI-powered PowerBI analysis and documentation
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1}>
                            <Button
                                onClick={handleGenerateAll}
                                disabled={Object.values(sectionLoading).some(loading => loading)}
                                variant="contained"
                                size="small"
                                startIcon={Object.values(sectionLoading).some(loading => loading) ? <CircularProgress size={16} /> : <SparkleIcon size={16} />}
                                sx={{ 
                                    bgcolor: theme.palette.primary.main,
                                    color: 'white',
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.dark
                                    },
                                    '&:disabled': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.3)
                                    }
                                }}
                            >
                                {Object.values(sectionLoading).some(loading => loading) ? 'Generating...' : 'Generate All'}
                            </Button>
                            <Button
                                onClick={() => {
                                    // Reset all state
                                    setPbixFile(null);
                                    setDocumentation(null);
                                    setParsedRecommendations([]);
                                    setEditedContent({});
                                    setEditingSection(null);
                                    setActiveTab(0);
                                    setError(null);
                                    setShowUploadSuccess(false);
                                    // Trigger file input
                                    setTimeout(() => {
                                        pbixFileInput.current?.click();
                                    }, 100);
                                }}
                                variant="outlined"
                                size="small"
                                startIcon={<CloudArrowUpIcon size={16} />}
                                sx={{ 
                                    color: '#333',
                                    borderColor: alpha('#333', 0.3),
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    '&:hover': {
                                        borderColor: '#333',
                                        bgcolor: alpha('#333', 0.05)
                                    }
                                }}
                            >
                                Upload New File
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Hidden file input for "Upload New File" button */}
            <input
                ref={pbixFileInput}
                type="file"
                accept=".pbix"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                multiple={false}
            />

            {/* Main Content */}
            <Box 
                sx={{
                    width: '100%',
                    flexGrow: 1,
                    mt: pbixFile ? 3 : 0,
                    px: 0,
                    py: 0,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Welcome Section - Show only when no file is uploaded */}
                {!pbixFile && (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexGrow: 1,
                            textAlign: 'center',
                            py: 8,
                            px: 4
                        }}
                    >
                        <Box 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                                mb: 4,
                                border: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                        >
                            <FileTextIcon size={64} />
                        </Box>
                        <Typography variant="h3" sx={{ 
                            fontWeight: 700, 
                            mb: 2, 
                            color: isDarkMode ? '#FFFFFF' : theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                        }}>
                            Welcome to ClaribiDocs
                        </Typography>
                        <Typography variant="h6" sx={{ 
                            color: isDarkMode ? '#E0E0E0' : theme.palette.text.secondary, 
                            mb: 6, 
                            maxWidth: 600,
                            lineHeight: 1.6,
                            fontWeight: 400
                        }}>
                            Upload a Power BI (.pbix) file to generate comprehensive documentation and analysis of your data model.
                        </Typography>
                        
                        {/* Upload Button */}
                        <Box display="flex" gap={3} mt={2}>
                            <Button
                                variant="contained"
                                startIcon={<CloudArrowUpIcon size={20} />}
                                onClick={handleFileSelect}
                                sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    height: 48,
                                    bgcolor: theme.palette.primary.main,
                                    '&:hover': { 
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Upload Power BI File
                            </Button>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ mt: 4, borderRadius: 2, maxWidth: 500 }}>
                                <AlertTitle>Error</AlertTitle>
                                {error}
                            </Alert>
                        )}
                    </Box>
                )}



                {/* Documentation Sections */}
                {pbixFile && (
                    <Fade in={true} timeout={800}>
                        <Box>
                            {/* Compact Tab Navigation */}
                            <Paper 
                                sx={{ 
                                    mb: 4, 
                                    borderRadius: 2,
                                    boxShadow: theme.shadows[1],
                                    overflow: 'hidden',
                                    bgcolor: isDarkMode ? '#1E1E1E' : '#ffffff'
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
                                            color: isDarkMode ? '#B0B0B0' : 'inherit',
                                            '&:hover': {
                                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                                            },
                                            '&.Mui-selected': {
                                                fontWeight: 600,
                                                color: isDarkMode ? '#FFFFFF' : 'inherit'
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
                            <Box>
                                {sections.map((section, index) => (
                                    activeTab === index && (
                                        <Box key={section.id}>
                                            {renderDocumentationSection(
                                                section,
                                                documentation?.documentation?.[section.id]
                                            )}
                                        </Box>
                                    )
                                ))}
                            </Box>
                        </Box>
                    </Fade>
                )}
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

            {/* Success Snackbar */}
            <Snackbar
                open={showUploadSuccess}
                autoHideDuration={6000}
                onClose={() => setShowUploadSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 9999 }}
            >
                <Alert 
                    onClose={() => setShowUploadSuccess(false)} 
                    severity="success"
                    sx={{ 
                        width: '100%',
                        boxShadow: 3,
                        fontFamily: "'Nunito Sans', sans-serif"
                    }}
                >
                    File uploaded successfully! <strong>{pbixFile?.name}</strong> ({pbixFile ? (pbixFile.size / 1024 / 1024).toFixed(2) : '0'} MB) is ready for analysis.
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PowerBIDocumentation; 