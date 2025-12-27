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
import { parseImprovementRecommendations, getRecommendations, getDiagnosticsKPIs, getDiagnosticsKPIDetails } from '../../services/powerbiDocsService';

import { useNotification } from '../../contexts/NotificationContext';
import RecommendationCard from './components/RecommendationCard';
import DiagnosticsKPICard from './components/DiagnosticsKPICard';
import KPIDetailsDialog from './components/KPIDetailsDialog';
import OverallScoreCard from './components/OverallScoreCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PurchasePlanDialog from '../../components/ui/PurchasePlanDialog';

const DiagnosticsPage = ({ 
    selectedFile, 
    onBack, 
    showUploadSuccess, 
    successMessage,
    isNewlyUploaded = false
}) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [recommendations, setRecommendations] = useState([]);
    const [rawContent, setRawContent] = useState(null);
    const [applyingRecommendation, setApplyingRecommendation] = useState(null);
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
    
    // Purchase plan dialog state
    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
    const [purchaseDialogType, setPurchaseDialogType] = useState('upload'); // 'upload', 'regenerate', 'applyFix'

    
    // Chat interface state
    const [showChat, setShowChat] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState('');
    const [chatWidth, setChatWidth] = useState(50); // Percentage of viewport width
    const [isDragging, setIsDragging] = useState(false);
    
    // Track which file we've generated recommendations for
    const lastGeneratedFileRef = useRef(null);
    // Track if we're currently loading recommendations to prevent race conditions
    const isLoadingRecommendationsRef = useRef(false);

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
        // Show purchase plan dialog when apply fix is clicked
        setPurchaseDialogType('applyFix');
        setShowPurchaseDialog(true);
    }, []);

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

    const handleGenerateRecommendations = useCallback(async (forceRegenerate = false) => {
        if (!selectedFile) {
            showNotification('Please select a file first', 'error');
            return;
        }

        setIsLoading(true);
        setWarning(null);

        try {
            // Use parse-recommendations endpoint which parses from existing summaries
            // If forceRegenerate is false, it will check for existing recommendations first
            const parsedResult = await parseImprovementRecommendations(selectedFile.collection_name, forceRegenerate);
            setRecommendations(parsedResult.recommendations || []);
            
            // Set raw content from recommendations for display
            if (parsedResult.recommendations && parsedResult.recommendations.length > 0) {
                setRawContent({ recommendations: parsedResult.recommendations });
            }
        } catch (err) {
            showNotification(err.message || err.error || 'An error occurred while generating improvement recommendations', 'error');
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile, showNotification]);

    const handleRegenerate = useCallback(() => {
        // Show purchase plan dialog when regenerate is clicked
        setPurchaseDialogType('regenerate');
        setShowPurchaseDialog(true);
    }, []);

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

    // Load existing recommendations when selectedFile changes
    useEffect(() => {
        const loadRecommendations = async () => {
            if (!selectedFile?.collection_name) {
                setInitialLoadComplete(true);
                lastGeneratedFileRef.current = null;
                setRecommendations([]);
                return;
            }

            const fileId = selectedFile.collection_name;
            
            // Reset recommendations when file changes
            if (fileId !== lastGeneratedFileRef.current) {
                setRecommendations([]);
                lastGeneratedFileRef.current = fileId;
            }

            // If it's a newly uploaded file, skip loading existing recommendations
            // and mark as complete - generation will happen in separate effect
            if (isNewlyUploaded) {
                setInitialLoadComplete(true);
                return;
            }

            // Try to load existing recommendations first for reopened files
            isLoadingRecommendationsRef.current = true;
            setIsLoading(true);
            try {
                const existingRecommendations = await getRecommendations(fileId);
                if (existingRecommendations && existingRecommendations.recommendations && existingRecommendations.recommendations.length > 0) {
                    setRecommendations(existingRecommendations.recommendations);
                    setRawContent({ recommendations: existingRecommendations.recommendations });
                    setInitialLoadComplete(true);
                    setIsLoading(false);
                    isLoadingRecommendationsRef.current = false;
                    return;
                }
            } catch (err) {
                // If recommendations don't exist, that's fine - we'll generate them
                console.log('No existing recommendations found, will generate new ones');
            } finally {
                setIsLoading(false);
                isLoadingRecommendationsRef.current = false;
            }

            // Mark as complete - if no recommendations found, generation will happen in separate effect
            setInitialLoadComplete(true);
        };

        loadRecommendations();
    }, [selectedFile?.collection_name, isNewlyUploaded]);

    // Automatically generate recommendations when needed
    useEffect(() => {
        const fileId = selectedFile?.collection_name;
        if (!fileId || !initialLoadComplete || isLoading || isLoadingRecommendationsRef.current) {
            return;
        }

        // Generate recommendations if:
        // 1. It's a newly uploaded file, OR
        // 2. No recommendations are currently loaded
        if ((isNewlyUploaded || recommendations.length === 0) && fileId === lastGeneratedFileRef.current) {
            handleGenerateRecommendations(false);
        }
    }, [selectedFile?.collection_name, initialLoadComplete, recommendations.length, isLoading, isNewlyUploaded, handleGenerateRecommendations]);

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
                        
                        </Box>
                    </Box>

                    {/* Warning Alert */}
                    {warning && (
                        <Box sx={{ px: 4, pt: 2 }}>
                            <Alert 
                                severity="warning" 
                                onClose={() => setWarning(null)}
                                sx={{ borderRadius: 2 }}
                            >
                                {renderMessageWithLinks(warning)}
                            </Alert>
                        </Box>
                    )}

                    {/* Main Content Area with padding */}
                    <Box sx={{ px: 4, py: 4, flexGrow: 1 }}>
                    {/* Overall Score Card */}
                    {kpis && (
                        <OverallScoreCard kpis={kpis} />
                    )}

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
                                        description={`${kpis.unused_columns?.count || 0} out of ${kpis.total_columns || 0} columns are not used in any visuals, measures, or relationships`}
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
                                    recommendations.length > 0 && (
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
                                            Generating recommendations for your Power BI file...
                                        </Typography>
                                        <Typography variant="body2" align="center" sx={{ color: theme.palette.text.disabled }}>
                                            Analyzing your file to provide actionable improvement suggestions
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

                {/* Purchase Plan Dialog */}
                <PurchasePlanDialog
                    open={showPurchaseDialog}
                    onClose={() => setShowPurchaseDialog(false)}
                    title={
                        purchaseDialogType === 'regenerate' 
                            ? 'Upgrade Required' 
                            : purchaseDialogType === 'applyFix'
                            ? 'Upgrade Required'
                            : 'Upload Limit Reached'
                    }
                    message={
                        purchaseDialogType === 'regenerate'
                            ? 'To regenerate recommendations, please purchase a plan by visiting'
                            : purchaseDialogType === 'applyFix'
                            ? 'To apply fixes to your Power BI file, please purchase a plan by visiting'
                            : 'You have already uploaded a file. To upload more files, please purchase a plan by visiting'
                    }
                />
            </Box>
        </Fade>
    );
};

export default DiagnosticsPage;

