import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Fade,
    CircularProgress,
    useTheme,
    alpha,
    Tooltip,
    Alert,
    AlertTitle,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Link,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    IconButton
} from '@mui/material';
import {
    LightbulbIcon,
    SparkleIcon,
    ArrowLeft,
    ArrowClockwiseIcon,
    Calculator,
    Columns,
    Table,
    LinkBreak,
    Stack,
    ChartBar,
    LinkSimple,
    DotsThreeVertical,
    CloudArrowUp
} from '@phosphor-icons/react';
import { analyzePowerBISection, parseImprovementRecommendations, getGeneratedDocs, getDiagnosticsKPIs, getDiagnosticsKPIDetails } from '../../services/powerbiDocsService';
import { reuploadPowerBIFile } from '../../services/powerbiChatService';
import { useNotification } from '../../contexts/NotificationContext';
import RecommendationCard from '../powerbi-docs/components/RecommendationCard';
import DiagnosticsKPICard from './components/DiagnosticsKPICard';
import KPIDetailsDialog from './components/KPIDetailsDialog';
import ChatPage from '../powerbi-chat/ChatPage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DiagnosticsPage = ({ 
    selectedFile, 
    onBack, 
    showUploadSuccess, 
    successMessage 
}) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [recommendations, setRecommendations] = useState([]);
    const [rawContent, setRawContent] = useState(null);
    const [applyingRecommendation, setApplyingRecommendation] = useState(null);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [kpis, setKpis] = useState(null);
    const [kpisLoading, setKpisLoading] = useState(false);
    
    // KPI Details Dialog state
    const [kpiDetailsOpen, setKpiDetailsOpen] = useState(false);
    const [selectedKpiType, setSelectedKpiType] = useState(null);
    const [kpiDetails, setKpiDetails] = useState([]);
    const [kpiDetailsLoading, setKpiDetailsLoading] = useState(false);
    const [kpiDetailsError, setKpiDetailsError] = useState(null);
    
    // Cache for KPI details - keyed by KPI type
    const [kpiDetailsCache, setKpiDetailsCache] = useState(new Map());
    const [kpiDetailsCacheLoading, setKpiDetailsCacheLoading] = useState(false);
    
    // Menu state for 3 dots
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const menuOpen = Boolean(menuAnchorEl);
    
    // Reupload state
    const [reuploadingFile, setReuploadingFile] = useState(false);
    const [reuploadProgress, setReuploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    
    // Chat interface state
    const [showChat, setShowChat] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState('');
    const [chatWidth, setChatWidth] = useState(50); // Percentage of viewport width
    const [isDragging, setIsDragging] = useState(false);

    // Memoize sorted recommendations to prevent re-sorting on every render
    const sortedRecommendations = useMemo(() => {
        if (!recommendations || recommendations.length === 0) return [];
        
        return [...recommendations].sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            return bPriority - aPriority; // High priority first
        });
    }, [recommendations]);

    const handleApplyRecommendation = useCallback((recommendation) => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        // Create the initial message for the chat
        const initialMessage = `Please guide me step-by-step on how to implement this recommendation: ${recommendation.title} - ${recommendation.description}`;
        
        // Set the chat state
        setChatInitialMessage(initialMessage);
        setShowChat(true);
        setError(null);
    }, [selectedFile]);

    const handleCloseChat = () => {
        setShowChat(false);
        setChatInitialMessage('');
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

    // Helper function to render message with clickable links
    const renderMessageWithLinks = (message) => {
        if (!message) return message;
        
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = message.split(urlRegex);
        
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

    const handleKPIClick = useCallback((kpiType, title) => {
        if (!selectedFile?.collection_name) {
            return;
        }

        setSelectedKpiType(kpiType);
        setKpiDetailsOpen(true);
        setKpiDetailsError(null);
        
        // Check if we have cached data for this KPI type
        const cachedDetails = kpiDetailsCache.get(kpiType);
        if (cachedDetails !== undefined) {
            // Use cached data - no loading needed
            setKpiDetails(cachedDetails);
            setKpiDetailsLoading(false);
        } else {
            // Data not yet cached or cache is still loading - show loading
            setKpiDetailsLoading(true);
            setKpiDetails([]);
        }
    }, [selectedFile, kpiDetailsCache]);

    const handleCloseKPIDetails = () => {
        setKpiDetailsOpen(false);
        setSelectedKpiType(null);
        // Don't clear kpiDetails - keep it for when dialog reopens
        setKpiDetailsError(null);
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
    useEffect(() => {
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

    const handleGenerateRecommendations = useCallback(async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setIsLoading(true);
        setError(null);
        setWarning(null);

        try {
            const result = await analyzePowerBISection(selectedFile.collection_name, 'improvement_recommendations', '');
            
            // Check for warning in response
            if (result && result.warning && result.warning.type === 'approaching_limit') {
                setWarning(result.warning.message || 'You are approaching your usage limit.');
            }
            
            // Update content
            setRawContent(result.analysis);

            // Special handling for improvement_recommendations - extract structured data
            if (result.analysis && typeof result.analysis === 'object') {
                if (result.analysis.recommendations) {
                    setRecommendations(result.analysis.recommendations);
                } else if (result.analysis.raw_text) {
                    // If backend returns structured format but parsing failed, try to parse again
                    try {
                        const parsedResult = await parseImprovementRecommendations(selectedFile.collection_name);
                        setRecommendations(parsedResult.recommendations || []);
                    } catch (parseError) {
                        console.error('Error parsing recommendations:', parseError);
                        setRecommendations([]);
                    }
                }
            }
        } catch (err) {
            // Handle usage limit exceeded errors with user-friendly messages
            if (err.error === 'usage_limit_exceeded') {
                setError(err.message || 'You have reached your usage limit. Please upgrade your plan to continue generating improvement recommendations.');
            } else {
                setError(err.message || err.error || 'An error occurred while generating improvement recommendations');
            }
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile]);

    const handleRegenerate = useCallback(() => {
        handleGenerateRecommendations();
    }, [handleGenerateRecommendations]);

    // Load KPIs when selectedFile changes
    useEffect(() => {
        const loadKPIs = async () => {
            if (!selectedFile?.collection_name) {
                setKpis(null);
                return;
            }

            setKpisLoading(true);
            try {
                const response = await getDiagnosticsKPIs(selectedFile.collection_name);
                setKpis(response.kpis);
            } catch (err) {
                console.error('Error loading KPIs:', err);
                // Don't set error state for this - just log it silently
                setKpis(null);
            } finally {
                setKpisLoading(false);
            }
        };

        loadKPIs();
    }, [selectedFile?.collection_name]);

    // Load all KPI details on initial mount when selectedFile changes
    useEffect(() => {
        const loadAllKPIDetails = async () => {
            if (!selectedFile?.collection_name) {
                setKpiDetailsCache(new Map());
                return;
            }

            setKpiDetailsCacheLoading(true);
            
            // Define all KPI types
            const kpiTypes = [
                'unused_columns',
                'unused_measures',
                'complex_measures',
                'inactive_relationships',
                'many_to_many_relationships',
                'large_tables',
                'crowded_pages'
            ];

            try {
                // Fetch all KPI details in parallel
                const detailPromises = kpiTypes.map(async (kpiType) => {
                    try {
                        const response = await getDiagnosticsKPIDetails(selectedFile.collection_name, kpiType);
                        return { kpiType, details: response.details || [] };
                    } catch (err) {
                        console.error(`Error loading KPI details for ${kpiType}:`, err);
                        // Return empty array for failed requests
                        return { kpiType, details: [] };
                    }
                });

                const results = await Promise.all(detailPromises);
                
                // Build cache map from results
                const newCache = new Map();
                results.forEach(({ kpiType, details }) => {
                    newCache.set(kpiType, details);
                });
                
                setKpiDetailsCache(newCache);
            } catch (err) {
                console.error('Error loading KPI details cache:', err);
                // Set empty cache on error
                setKpiDetailsCache(new Map());
            } finally {
                setKpiDetailsCacheLoading(false);
            }
        };

        loadAllKPIDetails();
    }, [selectedFile?.collection_name]);

    // When cache finishes loading and dialog is open, populate it with cached data
    useEffect(() => {
        if (!kpiDetailsCacheLoading && kpiDetailsOpen && selectedKpiType) {
            const cachedDetails = kpiDetailsCache.get(selectedKpiType);
            if (cachedDetails !== undefined) {
                setKpiDetails(cachedDetails);
                setKpiDetailsLoading(false);
            }
        }
    }, [kpiDetailsCacheLoading, kpiDetailsOpen, selectedKpiType, kpiDetailsCache]);

    // Load existing generated recommendations when selectedFile changes
    useEffect(() => {
        const loadExistingRecommendations = async () => {
            if (!selectedFile?.collection_name) {
                setInitialLoadComplete(true);
                return;
            }

            setInitialLoadComplete(false);
            setError(null);

            try {
                const response = await getGeneratedDocs(selectedFile.collection_name);
                const generatedSections = response.generated_sections || {};

                // Handle improvement recommendations
                const improvementData = generatedSections.improvement_recommendations?.content;
                if (improvementData) {
                    if (improvementData.recommendations) {
                        // Direct object format
                        setRecommendations(improvementData.recommendations);
                        setRawContent(improvementData);
                    } else if (improvementData.content && improvementData.content.recommendations) {
                        // New wrapped format
                        setRecommendations(improvementData.content.recommendations);
                        setRawContent(improvementData.content);
                    } else if (typeof improvementData === 'string') {
                        // String format
                        setRawContent(improvementData);
                    }
                }
            } catch (err) {
                console.error('Error loading existing recommendations:', err);
                // Don't set error state for this - just log it silently
                // The user can still generate new recommendations
            } finally {
                setInitialLoadComplete(true);
            }
        };

        loadExistingRecommendations();
    }, [selectedFile?.collection_name]);

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

                {/* Main Diagnostics Area */}
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

                            {/* 3 Dots Menu Button */}
                            <Tooltip title="More options">
                                <Button
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
                    {/* KPIs Section */}
                    {kpis && (
                        <Box sx={{ mb: 4 }}>
                            <Grid container spacing={2} justifyContent="center">
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Unused Columns"
                                        value={(() => {
                                            const unused = kpis.unused_columns?.count || 0;
                                            const total = kpis.total_columns || 0;
                                            const percentage = total > 0 ? ((unused / total) * 100).toFixed(1) : 0;
                                            return `${unused}/${total} (${percentage}%)`;
                                        })()}
                                        description={`${kpis.unused_columns?.count || 0} out of ${kpis.total_columns || 0} columns are not used in any visuals or measure expressions`}
                                        severity={kpis.unused_columns?.count > 0 ? 'error' : 'success'}
                                        icon={Columns}
                                        onClick={kpis.unused_columns?.count > 0 ? () => handleKPIClick('unused_columns', 'Unused Columns') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Unused Measures"
                                        value={(() => {
                                            const unused = kpis.unused_measures?.count || 0;
                                            const total = kpis.total_measures || 0;
                                            const percentage = total > 0 ? ((unused / total) * 100).toFixed(1) : 0;
                                            return `${unused}/${total} (${percentage}%)`;
                                        })()}
                                        description={`${kpis.unused_measures?.count || 0} out of ${kpis.total_measures || 0} measures are not used in any visuals or referenced by other measures`}
                                        severity={kpis.unused_measures?.count > 0 ? 'error' : 'success'}
                                        icon={Calculator}
                                        onClick={kpis.unused_measures?.count > 0 ? () => handleKPIClick('unused_measures', 'Unused Measures') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Complex Measures"
                                        value={kpis.complex_measures?.count || 0}
                                        description={`${kpis.complex_measures?.count || 0} measures have expressions longer than 1000 characters, which may impact performance`}
                                        severity={kpis.complex_measures?.count > 0 ? 'warning' : 'success'}
                                        icon={Calculator}
                                        onClick={kpis.complex_measures?.count > 0 ? () => handleKPIClick('complex_measures', 'Complex Measures') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Inactive Relationships"
                                        value={(() => {
                                            const inactive = kpis.inactive_relationships?.count || 0;
                                            const total = kpis.total_relationships || 0;
                                            const percentage = total > 0 ? ((inactive / total) * 100).toFixed(1) : 0;
                                            return `${inactive}/${total} (${percentage}%)`;
                                        })()}
                                        description={`${kpis.inactive_relationships?.count || 0} out of ${kpis.total_relationships || 0} relationships are marked as inactive`}
                                        severity={kpis.inactive_relationships?.count > 0 ? 'warning' : 'success'}
                                        icon={LinkBreak}
                                        onClick={kpis.inactive_relationships?.count > 0 ? () => handleKPIClick('inactive_relationships', 'Inactive Relationships') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Many-to-Many Relationships"
                                        value={kpis.many_to_many_relationships?.count || 0}
                                        description={`${kpis.many_to_many_relationships?.count || 0} relationships use many-to-many cardinality, which may cause data modeling issues`}
                                        severity={kpis.many_to_many_relationships?.count > 0 ? 'warning' : 'success'}
                                        icon={LinkSimple}
                                        onClick={kpis.many_to_many_relationships?.count > 0 ? () => handleKPIClick('many_to_many_relationships', 'Many-to-Many Relationships') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Large Tables"
                                        value={kpis.large_tables?.count || 0}
                                        description={`${kpis.large_tables?.count || 0} tables have more than 50 columns, which may impact performance`}
                                        severity={kpis.large_tables?.count > 0 ? 'warning' : 'success'}
                                        icon={Stack}
                                        onClick={kpis.large_tables?.count > 0 ? () => handleKPIClick('large_tables', 'Large Tables') : undefined}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <DiagnosticsKPICard
                                        title="Crowded Pages"
                                        value={kpis.crowded_pages?.count || 0}
                                        description={`${kpis.crowded_pages?.count || 0} pages have more than 10 visuals, which may impact performance`}
                                        severity={kpis.crowded_pages?.count > 0 ? 'warning' : 'success'}
                                        icon={ChartBar}
                                        onClick={kpis.crowded_pages?.count > 0 ? () => handleKPIClick('crowded_pages', 'Crowded Pages') : undefined}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* Recommendations Content */}
                    <Box sx={{ mt: 4, mb: 4 }}>
                        <Card 
                            elevation={0}
                            sx={{ 
                                borderRadius: 3,
                                boxShadow: theme.shadows[3],
                                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                position: 'relative',
                                overflow: 'visible',
                                bgcolor: theme.palette.background.paper
                            }}
                        >
                            <CardHeader
                                avatar={
                                    <Box 
                                        sx={{ 
                                            p: 1, 
                                            borderRadius: 2, 
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <LightbulbIcon size={20} />
                                    </Box>
                                }
                                title={
                                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600, color: 'inherit' }}>
                                        Improvement Recommendations
                                    </Typography>
                                }
                                subheader={
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Performance and optimization suggestions for your Power BI file
                                    </Typography>
                                }
                                action={
                                    recommendations.length > 0 ? (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                pr: 1,
                                                height: '100%'
                                            }}
                                        >
                                            <Tooltip title="Regenerate recommendations">
                                                <IconButton 
                                                    onClick={handleRegenerate}
                                                    disabled={isLoading}
                                                    size="small"
                                                    sx={{
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.background.hover
                                                        }
                                                    }}
                                                >
                                                    {isLoading ? <CircularProgress size={16} /> : <ArrowClockwiseIcon size={16} />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ) : (
                                        <Button
                                            onClick={handleGenerateRecommendations}
                                            disabled={isLoading}
                                            variant="contained"
                                            size="small"
                                            startIcon={isLoading ? <CircularProgress size={16} color={theme.palette.primary.contrastText} /> : <SparkleIcon size={16} color={theme.palette.primary.contrastText} />}
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
                                            {isLoading ? 'Generating...' : 'Generate Recommendations'}
                                        </Button>
                                    )
                                }
                                sx={{ 
                                    pb: 1,
                                    '& .MuiCardHeader-action': {
                                        alignSelf: 'center',
                                        marginTop: 0,
                                        marginRight: 0
                                    }
                                }}
                            />
                            
                            <CardContent sx={{ pt: 0, position: 'relative', bgcolor: 'transparent' }}>
                                {isLoading ? (
                                    <Box 
                                        display="flex" 
                                        flexDirection="column" 
                                        alignItems="center" 
                                        justifyContent="center"
                                        py={6}
                                    >
                                        <CircularProgress size={40} />
                                        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                            Generating recommendations...
                                        </Typography>
                                    </Box>
                                ) : recommendations.length > 0 ? (
                                    <Box>
                                        <Box mb={4}>
                                            {sortedRecommendations.map((rec) => (
                                                <RecommendationCard
                                                    key={rec.id}
                                                    recommendation={rec}
                                                    onApply={(recommendation) => handleApplyRecommendation(recommendation)}
                                                    isApplying={applyingRecommendation === rec.id}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box 
                                        display="flex" 
                                        flexDirection="column" 
                                        alignItems="center" 
                                        justifyContent="center"
                                        py={6}
                                        sx={{ 
                                            bgcolor: theme.palette.background.hover,
                                            borderRadius: 2,
                                            border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`
                                        }}
                                    >
                                        <Box sx={{ color: theme.palette.text.disabled, mb: 2 }}>
                                            <LightbulbIcon size={48} />
                                        </Box>
                                        <Typography variant="body1" align="center" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                                            Click "Generate Recommendations" to analyze your Power BI file
                                        </Typography>
                                        <Typography variant="body2" align="center" sx={{ color: theme.palette.text.disabled }}>
                                            Get actionable improvement suggestions for performance, optimization, and best practices
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
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
                                isEphemeral={true}
                            />
                        </Box>
                    </>
                )}

                {/* KPI Details Dialog */}
                <KPIDetailsDialog
                    open={kpiDetailsOpen}
                    onClose={handleCloseKPIDetails}
                    kpiType={selectedKpiType}
                    details={kpiDetails}
                    loading={kpiDetailsLoading}
                    error={kpiDetailsError}
                    title={selectedKpiType ? 
                        selectedKpiType === 'unused_measures' ? 'Unused Measures' :
                        selectedKpiType === 'unused_columns' ? 'Unused Columns' :
                        selectedKpiType === 'inactive_relationships' ? 'Inactive Relationships' :
                        selectedKpiType === 'large_tables' ? 'Large Tables' :
                        selectedKpiType === 'complex_measures' ? 'Complex Measures' :
                        selectedKpiType === 'crowded_pages' ? 'Crowded Pages' :
                        selectedKpiType === 'many_to_many_relationships' ? 'Many-to-Many Relationships' :
                        'KPI Details'
                        : 'KPI Details'
                    }
                />
            </Box>
        </Fade>
    );
};

export default DiagnosticsPage;

