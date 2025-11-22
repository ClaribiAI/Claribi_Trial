import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
    Chip,
    Divider,
    Collapse,
    IconButton
} from '@mui/material';
import {
    X,
    Calculator,
    Columns,
    Table,
    LinkBreak,
    CaretDown,
    CaretRight,
    Stack,
    ChartBar,
    LinkSimple
} from '@phosphor-icons/react';

const KPIDetailsDialog = ({ open, onClose, kpiType, details, loading, error, title }) => {
    const theme = useTheme();
    const [expandedTables, setExpandedTables] = useState(new Set());
    const lastValidDetailsRef = useRef(null);

    const getIcon = () => {
        switch (kpiType) {
            case 'unused_measures':
                return Calculator;
            case 'unused_columns':
                return Columns;
            case 'inactive_relationships':
                return LinkBreak;
            case 'large_tables':
                return Stack;
            case 'complex_measures':
                return Calculator;
            case 'crowded_pages':
                return ChartBar;
            case 'many_to_many_relationships':
                return LinkSimple;
            default:
                return null;
        }
    };

    const formatItem = (item, index) => {
        if (typeof item === 'string') {
            return item;
        }

        switch (kpiType) {
            case 'unused_measures':
                return `${item.name || item.measure || 'Unknown'}`;
            case 'unused_columns':
                return `${item.name || item.column || 'Unknown'}`;
            case 'inactive_relationships':
                return `${item.from_table || 'Unknown'}[${item.from_column || 'Unknown'}] → ${item.to_table || 'Unknown'}[${item.to_column || 'Unknown'}]`;
            case 'large_tables':
                return `${item.name || 'Unknown'} (${item.column_count || 0} columns)`;
            case 'complex_measures':
                return `${item.name || 'Unknown'} (${item.expression_length || 0} characters)`;
            case 'crowded_pages':
                return `${item.name || 'Unknown'} (${item.visual_count || 0} visuals)`;
            case 'many_to_many_relationships':
                return `${item.from_table || 'Unknown'}[${item.from_column || 'Unknown'}] → ${item.to_table || 'Unknown'}[${item.to_column || 'Unknown'}] (${item.cardinality || 'Many-to-Many'})`;
            default:
                return JSON.stringify(item);
        }
    };

    const groupItemsByTable = (items) => {
        if (!items || items.length === 0) return {};

        // For inactive_relationships and many_to_many_relationships, don't group - return as flat list
        if (kpiType === 'inactive_relationships' || kpiType === 'many_to_many_relationships') {
            return { 'All Relationships': items };
        }

        // For crowded_pages, don't group - return as flat list
        if (kpiType === 'crowded_pages') {
            return { 'Pages': items };
        }

        // For large_tables, don't group - return as flat list
        if (kpiType === 'large_tables') {
            return { 'Tables': items };
        }

        // For unused_measures, unused_columns, and complex_measures, group by table property
        const grouped = {};
        items.forEach(item => {
            const tableName = item.table || 'Unknown';
            if (!grouped[tableName]) {
                grouped[tableName] = [];
            }
            grouped[tableName].push(item);
        });
        return grouped;
    };

    const IconComponent = getIcon();
    // Use current details or last valid details (to prevent flash during close)
    const displayDetails = (details && details.length > 0) 
        ? details 
        : (lastValidDetailsRef.current || []);
    const groupedItems = useMemo(() => {
        return displayDetails && displayDetails.length > 0 ? groupItemsByTable(displayDetails) : {};
    }, [displayDetails, kpiType]);
    
    const tableNames = useMemo(() => {
        return Object.keys(groupedItems).sort();
    }, [groupedItems]);

    // Store last valid details to prevent flash of empty state when closing
    useEffect(() => {
        if (details && details.length > 0) {
            lastValidDetailsRef.current = details;
        }
    }, [details]);

    // Reset expanded state when dialog opens/closes
    useEffect(() => {
        if (open) {
            // Clear ref when dialog opens to avoid showing stale data
            if (!details || details.length === 0) {
                lastValidDetailsRef.current = null;
            }
        } else {
            setExpandedTables(new Set());
            // Keep last valid details during close animation
            // Clear after a delay to allow animation to complete
            const timer = setTimeout(() => {
                lastValidDetailsRef.current = null;
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [open, details]);

    const toggleTable = (tableName) => {
        setExpandedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableName)) {
                newSet.delete(tableName);
            } else {
                newSet.add(tableName);
            }
            return newSet;
        });
    };

    const isTableExpanded = (tableName) => {
        return expandedTables.has(tableName);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 8px 32px rgba(0,0,0,0.4)' 
                        : '0 8px 32px rgba(0,0,0,0.12)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    overflow: 'hidden'
                }
            }}
        >
            {/* Header Section */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 3,
                    py: 2.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.background.paper, 0.8)
                        : alpha(theme.palette.sidebar.background, 0.5)
                }}
            >
                {IconComponent && (
                    <Box
                        sx={{
                            p: 1.25,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <IconComponent size={22} weight="fill" />
                    </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                            fontWeight: 600,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                            color: theme.palette.text.primary,
                            lineHeight: 1.3
                        }}
                    >
                        {title || 'KPI Details'}
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        minWidth: 'auto',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        color: theme.palette.text.secondary,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: theme.palette.error.main
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    <X size={18} weight="bold" />
                </IconButton>
            </DialogTitle>

            {/* Content Section */}
            <DialogContent sx={{ p: 0, bgcolor: theme.palette.background.paper }}>
                {loading ? (
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        py={8}
                        px={3}
                    >
                        <CircularProgress 
                            size={48} 
                            sx={{ 
                                color: theme.palette.primary.main,
                                mb: 2
                            }} 
                        />
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: theme.palette.text.secondary,
                                fontFamily: "'Nunito Sans', sans-serif",
                                fontWeight: 500
                            }}
                        >
                            Loading details...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 3 }}>
                        <Alert 
                            severity="error" 
                            sx={{ 
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                '& .MuiAlert-icon': {
                                    color: theme.palette.error.main
                                }
                            }}
                        >
                            {error}
                        </Alert>
                    </Box>
                ) : displayDetails && displayDetails.length > 0 ? (
                    <Box>
                        {/* Summary Section */}
                        <Box 
                            sx={{ 
                                px: 3, 
                                py: 2.5,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                bgcolor: theme.palette.mode === 'dark' 
                                    ? alpha(theme.palette.background.default, 0.5)
                                    : alpha(theme.palette.sidebar.background, 0.3),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5
                            }}
                        >
                            <Chip
                                label={`${displayDetails.length} item${displayDetails.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                    fontFamily: "'Nunito Sans', sans-serif",
                                    height: 24,
                                    fontSize: '0.75rem'
                                }}
                            />
                            {kpiType !== 'inactive_relationships' && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        fontFamily: "'Nunito Sans', sans-serif",
                                        fontWeight: 500
                                    }}
                                >
                                    across {tableNames.length} table{tableNames.length !== 1 ? 's' : ''}
                                </Typography>
                            )}
                        </Box>

                        {/* Tables List */}
                        <List 
                            sx={{ 
                                maxHeight: '60vh', 
                                overflow: 'auto',
                                py: 0,
                                '&::-webkit-scrollbar': {
                                    width: '8px'
                                },
                                '&::-webkit-scrollbar-track': {
                                    bgcolor: 'transparent'
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: alpha(theme.palette.divider, 0.5),
                                    borderRadius: '4px',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.divider, 0.7)
                                    }
                                }
                            }}
                        >
                            {kpiType === 'inactive_relationships' ? (
                                // For inactive relationships, display as flat list without grouping
                                displayDetails.map((item, index) => (
                                    <ListItem
                                        key={`relationship-${index}`}
                                        sx={{
                                            py: 1.75,
                                            px: 3,
                                            borderBottom: index < displayDetails.length - 1 
                                                ? `1px solid ${alpha(theme.palette.divider, 0.08)}` 
                                                : 'none',
                                            transition: 'background-color 0.15s ease, padding-left 0.15s ease',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                                pl: 3.5
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                                        fontWeight: 500,
                                                        color: theme.palette.text.primary,
                                                        wordBreak: 'break-word',
                                                        fontSize: '0.875rem',
                                                        lineHeight: 1.6
                                                    }}
                                                >
                                                    {formatItem(item, index)}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))
                            ) : (
                                // For other types, use grouped/expandable structure
                                tableNames.map((tableName) => {
                                    const isExpanded = isTableExpanded(tableName);
                                    const itemCount = groupedItems[tableName].length;
                                    return (
                                        <React.Fragment key={tableName}>
                                            {/* Table Header */}
                                            <ListItem
                                                onClick={() => toggleTable(tableName)}
                                                sx={{
                                                    px: 3,
                                                    py: 2,
                                                    cursor: 'pointer',
                                                    bgcolor: theme.palette.background.paper,
                                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                                    transition: 'background-color 0.15s ease, border-left 0.15s ease',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        borderLeft: `3px solid ${theme.palette.primary.main}`
                                                    }
                                                }}
                                            >
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        p: 0.5,
                                                        mr: 1.5,
                                                        color: theme.palette.text.secondary,
                                                        transition: 'transform 0.15s ease, color 0.15s ease',
                                                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                        '&:hover': {
                                                            bgcolor: 'transparent',
                                                            color: theme.palette.primary.main
                                                        }
                                                    }}
                                                >
                                                    <CaretDown size={18} weight="bold" />
                                                </IconButton>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: theme.palette.text.primary,
                                                        fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                                        flex: 1,
                                                        fontSize: '0.938rem'
                                                    }}
                                                >
                                                    {tableName}
                                                </Typography>
                                                <Chip
                                                    label={itemCount}
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        minWidth: 32,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                        color: theme.palette.primary.main,
                                                        fontFamily: "'Nunito Sans', sans-serif"
                                                    }}
                                                />
                                            </ListItem>
                                            
                                            {/* Table Items */}
                                            <Collapse in={isExpanded} timeout={200}>
                                                <Box
                                                    sx={{
                                                        bgcolor: theme.palette.mode === 'dark' 
                                                            ? alpha(theme.palette.background.default, 0.3)
                                                            : alpha(theme.palette.sidebar.background, 0.2),
                                                        borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                                        ml: 3
                                                    }}
                                                >
                                                    {groupedItems[tableName].map((item, index) => (
                                                        <ListItem
                                                            key={`${tableName}-${index}`}
                                                            sx={{
                                                                py: 1.75,
                                                                px: 3,
                                                                pl: 4.5,
                                                                borderBottom: index < itemCount - 1 
                                                                    ? `1px solid ${alpha(theme.palette.divider, 0.08)}` 
                                                                    : 'none',
                                                                transition: 'background-color 0.15s ease, padding-left 0.15s ease',
                                                                '&:hover': {
                                                                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                                                                    pl: 5
                                                                }
                                                            }}
                                                        >
                                                            <ListItemText
                                                                primary={
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                                                            fontWeight: 500,
                                                                            color: theme.palette.text.primary,
                                                                            wordBreak: 'break-word',
                                                                            fontSize: '0.875rem',
                                                                            lineHeight: 1.6
                                                                        }}
                                                                    >
                                                                        {formatItem(item, index)}
                                                                    </Typography>
                                                                }
                                                            />
                                                        </ListItem>
                                                    ))}
                                                </Box>
                                            </Collapse>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </List>
                    </Box>
                ) : (
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        py={8}
                        px={3}
                        sx={{
                            bgcolor: theme.palette.background.paper,
                            borderRadius: 2,
                            border: `2px dashed ${alpha(theme.palette.divider, 0.3)}`,
                            mx: 3,
                            my: 3
                        }}
                    >
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.text.disabled, 0.1),
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {IconComponent && (
                                <IconComponent 
                                    size={32} 
                                    weight="duotone" 
                                    color={theme.palette.text.disabled}
                                />
                            )}
                        </Box>
                        <Typography 
                            variant="body1" 
                            sx={{ 
                                color: theme.palette.text.primary,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                                fontWeight: 600,
                                mb: 1
                            }}
                        >
                            No items found
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: theme.palette.text.secondary,
                                fontFamily: "'Nunito Sans', sans-serif",
                                textAlign: 'center',
                                maxWidth: 300
                            }}
                        >
                            There are no issues of this type in your Power BI file.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            {/* Footer Section */}
            <DialogActions 
                sx={{ 
                    px: 3, 
                    py: 2.5, 
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.background.paper, 0.8)
                        : alpha(theme.palette.sidebar.background, 0.5)
                }}
            >
                <Button
                    onClick={onClose}
                    variant="contained"
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        py: 1,
                        fontFamily: "'Nunito Sans', sans-serif",
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                            boxShadow: theme.shadows[4]
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default KPIDetailsDialog;

