import React from 'react';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    useTheme,
    alpha,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Chip
} from '@mui/material';
import {
    ChatCircle,
    FileText,
    Trash,
    CloudArrowUp,
    DotsThreeVertical,
    Table as TableIcon,
    Calculator,
    Columns,
    ChartBar,
    TreeStructure,
    Code,
    CaretUp,
    CaretDown
} from '@phosphor-icons/react';
import { deletePowerBISession } from '../../services/powerbiChatService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationDialog from './ConfirmationDialog';

const FileTable = ({ files, onFileClick, onUploadNew, onFileDelete, actionType = 'chat', onChatClick, onDocsClick }) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
    const [deletingFile, setDeletingFile] = React.useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
    const [fileToDelete, setFileToDelete] = React.useState(null);
    const [sortBy, setSortBy] = React.useState('date');
    const [sortOrder, setSortOrder] = React.useState('desc');

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder(column === 'date' ? 'desc' : 'asc');
        }
    };

    const getSortedFiles = () => {
        return [...files].sort((a, b) => {
            let aValue, bValue;
            
            if (sortBy === 'name') {
                aValue = (a.filename || '').toLowerCase();
                bValue = (b.filename || '').toLowerCase();
            } else {
                aValue = new Date(a.upload_time || 0);
                bValue = new Date(b.upload_time || 0);
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return null;
        return sortOrder === 'asc' ? <CaretUp size={16} /> : <CaretDown size={16} />;
    };

    const handleFileClick = (file) => {
        onFileClick(file);
    };

    const handleMenuOpen = (event, file) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedFile(file);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedFile(null);
    };

    const handleDeleteFile = () => {
        if (!selectedFile) return;
        setFileToDelete(selectedFile);
        setConfirmDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;

        setDeletingFile(fileToDelete.collection_name);
        
        try {
            await deletePowerBISession(fileToDelete.collection_name);
            showNotification(`File "${fileToDelete.filename}" deleted successfully!`, 'success');
            
            // Call the parent's delete handler to update the files list
            if (onFileDelete) {
                onFileDelete(fileToDelete);
            }
            setConfirmDialogOpen(false);
        } catch (err) {
            console.error('Error deleting file:', err);
            showNotification(`Failed to delete "${fileToDelete.filename}". ${err.message || 'Please try again.'}`, 'error');
            setConfirmDialogOpen(false);
        } finally {
            setDeletingFile(null);
            setFileToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
        setFileToDelete(null);
    };

    const handleViewFile = () => {
        setDetailsDialogOpen(true);
        setAnchorEl(null); // Close menu but keep selectedFile
    };

    const handleCloseDetailsDialog = () => {
        setDetailsDialogOpen(false);
        setSelectedFile(null); // Clear selectedFile when dialog closes
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header with Upload Button */}
            <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3} sx={{ flexShrink: 0 }}>
                <Button
                    variant="contained"
                    startIcon={<CloudArrowUp size={20} color={theme.palette.mode === 'dark' ? '#000000' : '#ffffff'} />}
                    onClick={onUploadNew}
                    sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1,
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        height: 40,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '&:hover': { 
                            bgcolor: theme.palette.primary.dark,
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                >
                    Upload New
                </Button>
            </Box>

            {/* File Table */}
            <TableContainer 
                component={Paper} 
                sx={{ 
                    borderRadius: 3,
                    bgcolor: theme.palette.background.paper,
                    boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 20px rgba(0,0,0,0.3)' 
                        : '0 4px 20px rgba(0,0,0,0.08)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    flexGrow: 1,
                    overflow: 'auto'
                }}
            >
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                            <TableCell 
                                onClick={() => handleSort('name')}
                                sx={{ 
                                    fontWeight: 600, 
                                    color: theme.palette.text.primary,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    py: 2,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 10,
                                    bgcolor: theme.palette.background.paper,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                                    },
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Name
                                    <Box sx={{ width: 16, display: 'flex', justifyContent: 'center' }}>
                                        {getSortIcon('name')}
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell 
                                onClick={() => handleSort('date')}
                                sx={{ 
                                    fontWeight: 600, 
                                    color: theme.palette.text.primary,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    py: 2,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 10,
                                    bgcolor: theme.palette.background.paper,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                                    },
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Last Modified
                                    <Box sx={{ width: 16, display: 'flex', justifyContent: 'center' }}>
                                        {getSortIcon('date')}
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: theme.palette.text.primary,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                py: 2,
                                textAlign: 'center',
                                width: 120,
                                position: 'sticky',
                                top: 0,
                                zIndex: 10,
                                bgcolor: theme.palette.background.paper
                            }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {getSortedFiles().map((file, index) => (
                            <TableRow
                                key={file.collection_name || file.filename || index}
                                onClick={() => handleFileClick(file)}
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        boxShadow: theme.palette.mode === 'dark' 
                                            ? '0 2px 8px rgba(0,0,0,0.2)' 
                                            : '0 2px 8px rgba(0,0,0,0.05)'
                                    },
                                    transition: 'all 0.2s ease',
                                    borderBottom: index < getSortedFiles().length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.05)}` : 'none'
                                }}
                            >
                                <TableCell sx={{ 
                                    py: 2.5,
                                    borderBottom: 'none'
                                }}>
                                    <Typography 
                                        variant="body1" 
                                        sx={{ 
                                            fontWeight: 500,
                                            color: theme.palette.text.primary,
                                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {file.filename || 'Untitled File'}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ 
                                    py: 2.5,
                                    borderBottom: 'none'
                                }}>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: theme.palette.text.secondary,
                                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                            fontSize: '0.8rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        {formatDate(file.upload_time)}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ 
                                    py: 2.5,
                                    borderBottom: 'none',
                                    textAlign: 'center'
                                }}>
                                    <Box display="flex" gap={1} justifyContent="center">
                                        {actionType === 'both' ? (
                                            <>
                                                <Tooltip title="Chat with this file">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onChatClick) onChatClick(file);
                                                        }}
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                transform: 'scale(1.1)'
                                                            },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <ChatCircle size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Generate documentation">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onDocsClick) onDocsClick(file);
                                                        }}
                                                        sx={{
                                                            color: theme.palette.secondary.main,
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                                transform: 'scale(1.1)'
                                                            },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <FileText size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <Tooltip title={actionType === 'chat' ? "Chat with this file" : "Generate documentation"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFileClick(file)}
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        '&:hover': {
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            transform: 'scale(1.1)'
                                                        },
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {actionType === 'chat' ? <ChatCircle size={18} /> : <FileText size={18} />}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="More actions">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, file)}
                                                sx={{
                                                    color: theme.palette.text.secondary,
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                                        color: theme.palette.text.primary,
                                                        transform: 'scale(1.1)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <DotsThreeVertical size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* More Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 160,
                        boxShadow: theme.palette.mode === 'dark' 
                            ? '0 8px 32px rgba(0,0,0,0.4)' 
                            : '0 8px 32px rgba(0,0,0,0.12)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem 
                    onClick={handleViewFile}
                    sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08)
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <FileText size={18} color={theme.palette.text.secondary} />
                    </ListItemIcon>
                    <ListItemText 
                        primary="View details"
                        primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 500
                        }}
                    />
                </MenuItem>
                <MenuItem 
                    onClick={handleDeleteFile}
                    disabled={deletingFile === selectedFile?.collection_name}
                    sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.08)
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        {deletingFile === selectedFile?.collection_name ? (
                            <LoadingSpinner size={18} compact />
                        ) : (
                            <Trash size={18} color={theme.palette.error.main} />
                        )}
                    </ListItemIcon>
                    <ListItemText 
                        primary={deletingFile === selectedFile?.collection_name ? "Deleting..." : "Delete file"}
                        primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 500,
                            color: theme.palette.error.main
                        }}
                    />
                </MenuItem>
            </Menu>

            {/* File Details Dialog */}
            <Dialog
                open={detailsDialogOpen}
                onClose={handleCloseDetailsDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: theme.palette.mode === 'dark' 
                            ? '0 24px 48px rgba(0,0,0,0.4)' 
                            : '0 24px 48px rgba(0,0,0,0.15)'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: 3,
                    fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '1.375rem',
                    letterSpacing: '-0.025em',
                    color: theme.palette.text.primary
                }}>
                    File Details
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {selectedFile ? (
                        <Box>
                            {/* File Name */}
                            <Box mb={4}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 600, 
                                    color: theme.palette.text.primary,
                                    fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                                    mb: 1.5,
                                    fontSize: '1.125rem',
                                    letterSpacing: '-0.01em'
                                }}>
                                    {selectedFile.filename || 'Untitled File'}
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}>
                                    Last Modified: {formatDate(selectedFile.upload_time)}
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* File Statistics */}
                            <Typography variant="h6" sx={{ 
                                fontWeight: 600, 
                                color: theme.palette.text.primary,
                                fontFamily: "'Inter', 'Cal Sans', 'Nunito Sans', sans-serif",
                                mb: 2.5,
                                fontSize: '1rem',
                                letterSpacing: '-0.01em'
                            }}>
                                File Analysis
                            </Typography>
                            
                            <Box display="flex" flexWrap="wrap" gap={1.5} mb={3}>
                                <Chip
                                    icon={<TableIcon size={14} />}
                                    label={`${selectedFile.metadata?.tables_count || 0} Tables`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.primary.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<Calculator size={14} />}
                                    label={`${selectedFile.metadata?.measures_count || 0} Measures`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.success.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.success.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.success.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<Columns size={14} />}
                                    label={`${selectedFile.metadata?.columns_count || 0} Columns`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.info.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.info.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.info.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<ChartBar size={14} />}
                                    label={`${selectedFile.metadata?.visuals_count || 0} Visuals`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.warning.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.warning.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<TreeStructure size={14} />}
                                    label={`${selectedFile.metadata?.relationships_count || 0} Relationships`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.secondary.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.secondary.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<Code size={14} />}
                                    label={`${selectedFile.metadata?.power_query_scripts_count || 0} Power Query Scripts`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.error.main, 0.08),
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                        fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                        fontSize: '0.75rem',
                                        height: 28,
                                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.error.main,
                                            fontSize: '14px'
                                        },
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.error.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
                                        }
                                    }}
                                />
                            </Box>

                            {/* Additional Info */}
                            <Box sx={{ 
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                borderRadius: 2,
                                p: 2.5,
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                            }}>
                                <Typography variant="body2" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                    mb: 1.5,
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }}>
                                    <strong>File Size:</strong> {selectedFile.file_size ? `${(selectedFile.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                    mb: 1.5,
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }}>
                                    <strong>Document Count:</strong> {selectedFile.document_count || 0} chunks
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }}>
                                    <strong>Collection ID:</strong> {selectedFile.collection_name || 'Unknown'}
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button
                        onClick={handleCloseDetailsDialog}
                        variant="outlined"
                        sx={{
                            borderRadius: 2.5,
                            px: 4,
                            py: 1.5,
                            fontFamily: "'Inter', 'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textTransform: 'none',
                            borderColor: alpha(theme.palette.divider, 0.3),
                            color: theme.palette.text.primary,
                            '&:hover': {
                                borderColor: alpha(theme.palette.divider, 0.5),
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                transform: 'translateY(-1px)',
                                boxShadow: theme.palette.mode === 'dark' 
                                    ? '0 4px 12px rgba(0,0,0,0.3)' 
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete File"
                message={`Are you sure you want to delete "${fileToDelete?.filename}"? This action cannot be undone and will permanently remove the file and all its associated data.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                isLoading={deletingFile === fileToDelete?.collection_name}
            />
        </Box>
    );
};

export default FileTable;
