import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    useTheme,
    alpha,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import {
    Clock,
    FileText,
    ChatCircle,
    X
} from '@phosphor-icons/react';
import statsService from '../../services/statsService';

const StatsCard = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    const [breakdownData, setBreakdownData] = useState(null);
    const [selectedStatType, setSelectedStatType] = useState(null); // 'documents', 'chat', 'hours'
    const [statsData, setStatsData] = useState({
        timeSaved: 0,
        documentsGenerated: 0,
        chatQueries: 0
    });
    
    // Use theme colors for consistency
    const accentColor = theme.palette.primary.main;
    const textColor = theme.palette.text.primary;
    const secondaryTextColor = theme.palette.text.secondary;
    
    // Fetch stats on component mount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await statsService.getUserStats();
                if (response.success && response.data) {
                    setStatsData({
                        timeSaved: response.data.time_saved || 0,
                        documentsGenerated: response.data.documents_generated || 0,
                        chatQueries: response.data.chat_queries || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
                // Keep default values on error
            } finally {
                setLoading(false);
            }
        };
        
        fetchStats();
    }, []);
    
    // Fetch breakdown data when a specific stat is clicked
    const handleStatClick = async (statType) => {
        setSelectedStatType(statType);
        setBreakdownOpen(true);
        
        // Only fetch breakdown data for documents
        if (statType === 'documents') {
            setBreakdownLoading(true);
            try {
                const response = await statsService.getUserStatsBreakdown();
                if (response.success && response.data) {
                    setBreakdownData(response.data);
                }
            } catch (error) {
                console.error('Error fetching breakdown:', error);
            } finally {
                setBreakdownLoading(false);
            }
        } else {
            // For hours and chat, we don't need to fetch additional data
            setBreakdownLoading(false);
            setBreakdownData(null);
        }
    };
    
    const handleCloseBreakdown = () => {
        setBreakdownOpen(false);
        setBreakdownData(null);
        setSelectedStatType(null);
    };
    
    // Format stats for display
    const stats = [
        {
            icon: Clock,
            label: 'Hours Saved',
            value: statsData.timeSaved.toString(),
            unit: '',
            color: accentColor,
            type: 'hours'
        },
        {
            icon: FileText,
            label: 'Documents Generated',
            value: statsData.documentsGenerated.toString(),
            unit: '',
            color: accentColor,
            type: 'documents'
        },
        {
            icon: ChatCircle,
            label: 'Chat Queries',
            value: statsData.chatQueries.toString(),
            unit: '',
            color: accentColor,
            type: 'chat'
        }
    ];

    return (
        <React.Fragment>
        <Card
            sx={{
                borderRadius: 2,
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 8px 32px rgba(0,0,0,0.4)' 
                        : '0 8px 32px rgba(0,0,0,0.12)'
                }
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Typography 
                    variant="subtitle1" 
                    sx={{ 
                        fontWeight: 600,
                        color: textColor,
                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                        mb: 2,
                        textAlign: 'center',
                        fontSize: '1rem'
                    }}
                >
                    Usage Statistics
                </Typography>
                
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5, justifyContent: 'space-between' }}>
                        {stats.map((stat, index) => {
                        const IconComponent = stat.icon;
                        return (
                            <Box
                                key={index}
                                onClick={() => handleStatClick(stat.type)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    bgcolor: theme.palette.mode === 'dark' 
                                        ? alpha(theme.palette.background.default, 0.5)
                                        : alpha(theme.palette.background.default, 0.3),
                                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    transition: 'all 0.2s ease',
                                    flex: 1,
                                    minWidth: 0,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: theme.palette.mode === 'dark' 
                                            ? alpha(theme.palette.background.default, 0.7)
                                            : alpha(theme.palette.background.default, 0.5),
                                        borderColor: alpha(accentColor, 0.3),
                                        transform: 'translateY(-1px)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 1.5,
                                        bgcolor: alpha(accentColor, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 0.5
                                    }}
                                >
                                    <IconComponent 
                                        size={18} 
                                        color={accentColor}
                                    />
                                </Box>
                                
                                <Box sx={{ textAlign: 'center', width: '100%' }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: textColor,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                            lineHeight: 1.1,
                                            mb: 0.25,
                                            fontSize: '1.25rem'
                                        }}
                                    >
                                        {stat.value}
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{
                                                color: secondaryTextColor,
                                                fontWeight: 500,
                                                ml: 0.5,
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {stat.unit}
                                        </Typography>
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: secondaryTextColor,
                                            fontSize: '0.7rem',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            display: 'block',
                                            lineHeight: 1.2
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                        })}
                    </Box>
                )}
            </CardContent>
        </Card>
        
        {/* Breakdown Dialog */}
        <Dialog
            open={breakdownOpen}
            onClose={handleCloseBreakdown}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper
                }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                    }}
                >
                    {selectedStatType === 'documents' && 'Documents Generated Breakdown'}
                    {selectedStatType === 'chat' && 'Chat Queries Information'}
                    {selectedStatType === 'hours' && 'Hours Saved Calculation'}
                </Typography>
                <Button
                    onClick={handleCloseBreakdown}
                    sx={{
                        minWidth: 'auto',
                        p: 0.5,
                        color: theme.palette.text.secondary,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.text.secondary, 0.1)
                        }
                    }}
                >
                    <X size={20} />
                </Button>
            </DialogTitle>
            <DialogContent>
                {breakdownLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : selectedStatType === 'documents' ? (
                    <Box>
                        {breakdownData && breakdownData.documents_breakdown && breakdownData.documents_breakdown.length > 0 ? (
                            <TableContainer
                                component={Paper}
                                sx={{
                                    bgcolor: theme.palette.mode === 'dark'
                                        ? alpha(theme.palette.background.default, 0.5)
                                        : alpha(theme.palette.background.default, 0.3),
                                    border: `1px solid ${theme.palette.divider}`
                                }}
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>PBIX File</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Documents Generated</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {breakdownData.documents_breakdown.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                                                        }}
                                                    >
                                                        {item.filename || item.collection_name || 'Unknown'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                                                        }}
                                                    >
                                                        {item.generation_count}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    fontStyle: 'italic'
                                }}
                            >
                                No documents generated yet.
                            </Typography>
                        )}
                    </Box>
                ) : selectedStatType === 'chat' ? (
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                mb: 2,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                color: accentColor
                            }}
                        >
                            {statsData.chatQueries}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                mb: 2
                            }}
                        >
                            This represents the total number of chat queries you've made across all Power BI files.
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: theme.palette.text.secondary,
                                fontStyle: 'italic',
                                display: 'block'
                            }}
                        >
                    
                        </Typography>
                    </Box>
                ) : selectedStatType === 'hours' ? (
                    <Box>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.default, 0.5)
                                    : alpha(theme.palette.background.default, 0.3),
                                border: `1px solid ${theme.palette.divider}`,
                                mb: 2
                            }}
                        >
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    mb: 2,
                                    fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                    color: accentColor
                                }}
                            >
                                {statsData.timeSaved} hours
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    mb: 2
                                }}
                            >
                                This is calculated based on:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            mb: 0.5,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                                        }}
                                    >
                                        Documents Generated: {statsData.documentsGenerated} × 2 hours = {statsData.documentsGenerated * 2} hours
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            ml: 2
                                        }}
                                    >
                                        Each document generation saves approximately 2 hours of manual work.
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            mb: 0.5,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                                        }}
                                    >
                                        Chat Queries: {statsData.chatQueries} × 0.1 hours = {(statsData.chatQueries * 0.1).toFixed(1)} hours
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            ml: 2
                                        }}
                                    >
                                        Each chat query saves approximately 0.1 hours of manual research and analysis.
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        mt: 1,
                                        pt: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                                        }}
                                    >
                                        Total: {statsData.documentsGenerated * 2} + {(statsData.chatQueries * 0.1).toFixed(1)} = {statsData.timeSaved} hours
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleCloseBreakdown}
                    variant="contained"
                    sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
        </React.Fragment>
    );
};

export default StatsCard;
