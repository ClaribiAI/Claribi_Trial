import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Snackbar,
  ButtonBase
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { fetchFavoriteGroups, fetchGroupUrls, deleteUrl, deleteFavoriteGroup, updateFavoriteGroup, clearUpdateError } from '../../store/slices/favoritesSlice';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Custom styles for react-grid-layout
const customGridStyles = `
  .react-resizable-handle {
    background-image: none !important;
    background-color: #B8860B !important; /* Darker gold for better contrast */
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0 0 4px 0;
    width: 10px !important;
    height: 10px !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .react-grid-item {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .react-grid-item:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .react-grid-item:hover .react-resizable-handle {
    opacity: 0.2;
  }

  .react-grid-item.resizing {
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
  }

  .react-grid-item.resizing .react-resizable-handle {
    opacity: 0.4;
    width: 12px !important;
    height: 12px !important;
  }

  .react-grid-item.react-draggable-dragging {
    box-shadow: 0 12px 16px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .react-grid-item.react-grid-placeholder {
    background: rgba(184, 134, 11, 0.03) !important;
    border: 1px dashed rgba(184, 134, 11, 0.3) !important;
    border-radius: 8px;
    opacity: 1 !important;
    box-shadow: inset 0 0 20px rgba(184, 134, 11, 0.05);
  }
`;

const ResponsiveGridLayout = WidthProvider(Responsive);

const FavoritesPage = () => {
  const dispatch = useDispatch();
  const { 
    groups, 
    urls, 
    loading, 
    error,
    updateLoading,
    updateError 
  } = useSelector(state => state.favorites);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [fullscreenReport, setFullscreenReport] = useState(null);
  const [layouts, setLayouts] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState(null);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeGroupForMenu, setActiveGroupForMenu] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState({ type: 'success', message: '' });

  const formatFilters = (filters) => {
    if (!filters) return '';
    try {
      const parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      // If it's a simple key-value pair in the format {"filter":"dimension = value"}
      if (parsedFilters.filter) {
        const [dimension, value] = parsedFilters.filter.split('=').map(s => s.trim());
        return `${dimension}: ${value}`;
      }
      // For more complex filter structures, return a simplified string
      return Object.entries(parsedFilters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch (e) {
      return String(filters);
    }
  };

  useEffect(() => {
    dispatch(fetchFavoriteGroups());
  }, [dispatch]);

  useEffect(() => {
    if (selectedGroup) {
      dispatch(fetchGroupUrls(selectedGroup));
    }
  }, [dispatch, selectedGroup]);

  useEffect(() => {
    // Set the first group as selected when groups are loaded
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  const handleGroupChange = (event, newGroup) => {
    if (newGroup !== null) {
      setSelectedGroup(newGroup);
    }
  };

  const handleDeleteClick = (groupId, urlId, title) => {
    setUrlToDelete({ groupId, urlId, title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (urlToDelete) {
      setDeleteDialogOpen(false);
      setUrlToDelete(null);
      await dispatch(deleteUrl({ groupId: urlToDelete.groupId, urlId: urlToDelete.urlId }));
    }
  };

  const handleFullscreen = (url) => {
    setFullscreenReport(fullscreenReport === url ? null : url);
  };

  const generateLayout = (items) => {
    return items.map((item, i) => ({
      i: item.id.toString(),
      x: (i % 3) * 4,
      y: Math.floor(i / 3) * 4,
      w: 4,
      h: 4,
      minW: 2,
      minH: 3
    }));
  };

  const handleLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
  };

  const handleMenuOpen = (event, group) => {
    event.stopPropagation();
    setActiveGroupForMenu(group);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
    setActiveGroupForMenu(null);
  };

  const handleDeleteGroupClick = (event) => {
    if (event) event.stopPropagation();
    handleMenuClose(event);
    if (activeGroupForMenu) {
      setGroupToDelete({ id: activeGroupForMenu.id, name: activeGroupForMenu.name });
      setDeleteGroupDialogOpen(true);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (groupToDelete) {
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);
      await dispatch(deleteFavoriteGroup(groupToDelete.id));
      // If the deleted group was selected, select the first available group
      if (selectedGroup === groupToDelete.id && groups.length > 1) {
        const nextGroup = groups.find(g => g.id !== groupToDelete.id);
        if (nextGroup) {
          setSelectedGroup(nextGroup.id);
        }
      }
    }
  };

  const handleRenameClick = (event) => {
    if (event) event.stopPropagation();
    handleMenuClose(event);
    if (activeGroupForMenu) {
      setNewGroupName(activeGroupForMenu.name);
      setRenameDialogOpen(true);
    }
  };

  const handleConfirmRename = async () => {
    if (activeGroupForMenu && newGroupName.trim() && newGroupName !== activeGroupForMenu.name) {
      try {
        const result = await dispatch(updateFavoriteGroup({
          groupId: activeGroupForMenu.id,
          name: newGroupName.trim()
        })).unwrap();
        
        // Close the dialog and reset state
        setRenameDialogOpen(false);
        setNewGroupName('');
        setActiveGroupForMenu(null);
        
        // Show success message
        setSnackbarMessage({
          type: 'success',
          message: 'Group renamed successfully'
        });
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Failed to rename group:', error);
        setSnackbarMessage({
          type: 'error',
          message: error.toString()
        });
        setSnackbarOpen(true);
      }
    } else {
      setRenameDialogOpen(false);
      setNewGroupName('');
      setActiveGroupForMenu(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const currentUrls = selectedGroup ? urls[selectedGroup] || [] : [];
  const currentLayout = layouts[selectedGroup] || generateLayout(currentUrls);

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <style>{customGridStyles}</style>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif" }}>
        My Favorites
      </Typography>

      {/* Group Toggle Buttons */}
      <Box sx={{ mb: 4 }}>
        <ToggleButtonGroup
          value={selectedGroup}
          exclusive
          onChange={handleGroupChange}
          aria-label="favorite groups"
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1,
            '& .MuiToggleButton-root': {
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              '&.Mui-selected': {
                backgroundColor: '#B8860B',
                color: 'white',
                '& .more-options-button': {
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                },
                '&:hover': {
                  backgroundColor: '#9A7209'
                }
              },
              '&:hover': {
                backgroundColor: 'rgba(184, 134, 11, 0.04)'
              }
            }
          }}
        >
          {groups.map((group) => (
            <ToggleButton 
              key={group.id}
              value={group.id}
              sx={{ 
                pl: 3,
                pr: 1,
                py: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontFamily: "'Nunito Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                width: 'auto'
              }}
            >
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <Typography 
                  sx={{ 
                    fontWeight: 'inherit',
                    fontFamily: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mr: 1
                  }}
                >
                  {group.name}
                </Typography>
                <Tooltip title="More Options">
                  <ButtonBase
                    component="div"
                    onClick={(e) => handleMenuOpen(e, group)}
                    className="more-options-button"
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#555555',
                      backgroundColor: 'transparent',
                      p: 0.25,
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '4px',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        backgroundColor: 'rgba(85, 85, 85, 0.1)',
                        color: '#B8860B'
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.1rem'
                      }
                    }}
                  >
                    <MoreVertIcon />
                  </ButtonBase>
                </Tooltip>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Group Options Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
              mt: 1.5,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
              fontFamily: "'Inter', sans-serif"
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem 
            onClick={handleRenameClick}
            sx={{
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#B8860B' },
                '& .MuiTypography-root': { color: '#B8860B' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Rename Group"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500
              }}
            />
          </MenuItem>
          <MenuItem 
            onClick={handleDeleteGroupClick}
            sx={{
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '& .MuiListItemIcon-root': { color: '#B8860B' },
                '& .MuiTypography-root': { color: '#B8860B' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Delete Group"
              primaryTypographyProps={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500
              }}
            />
          </MenuItem>
        </Menu>
      </Box>

      {/* Fullscreen Report */}
      {fullscreenReport && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'white',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            bgcolor: 'white'
          }}>
            <Typography variant="h6" sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
              {fullscreenReport.title}
            </Typography>
            <IconButton
              onClick={() => setFullscreenReport(null)}
              sx={{ color: '#6a1b9a' }}
            >
              <FullscreenExitIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <iframe
              title={fullscreenReport.title}
              src={fullscreenReport.url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          </Box>
        </Box>
      )}

      {/* Delete URL Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3,
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#d32f2f',
            fontFamily: "'Nunito Sans', sans-serif",
            fontWeight: 600,
            p: 0,
            mb: 2
          }}
        >
          Delete Favorite
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Typography
            sx={{
              fontFamily: "'Nunito Sans', sans-serif",
              color: '#555555',
              mb: 2
            }}
          >
            Are you sure you want to remove "{urlToDelete?.title}" from your favorites? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            sx={{
              borderRadius: '8px',
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog
        open={deleteGroupDialogOpen}
        onClose={() => setDeleteGroupDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3,
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#d32f2f',
            fontFamily: "'Nunito Sans', sans-serif",
            fontWeight: 600,
            p: 0,
            mb: 2
          }}
        >
          Delete Favorites Group
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Typography
            sx={{
              fontFamily: "'Nunito Sans', sans-serif",
              color: '#555555',
              mb: 2
            }}
          >
            Are you sure you want to delete the group "{groupToDelete?.name}"? This will permanently remove all saved favorites in this group. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: 2 }}>
          <Button
            onClick={() => setDeleteGroupDialogOpen(false)}
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteGroup}
            variant="contained"
            sx={{
              borderRadius: '8px',
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            Delete Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Group Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          if (!updateLoading) {
            setRenameDialogOpen(false);
            setNewGroupName('');
            setActiveGroupForMenu(null);
            dispatch(clearUpdateError());
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 3,
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            fontFamily: "'Nunito Sans', sans-serif",
            fontWeight: 600,
            p: 0,
            mb: 2
          }}
        >
          Rename Group
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {updateError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={() => dispatch(clearUpdateError())}
            >
              {updateError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            error={Boolean(updateError)}
            disabled={updateLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
              '& .MuiInputLabel-root': {
                fontFamily: "'Nunito Sans', sans-serif"
              },
              '& .MuiInputBase-input': {
                fontFamily: "'Nunito Sans', sans-serif"
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: 3 }}>
          <Button
            onClick={() => {
              setRenameDialogOpen(false);
              setNewGroupName('');
              setActiveGroupForMenu(null);
              dispatch(clearUpdateError());
            }}
            disabled={updateLoading}
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRename}
            variant="contained"
            disabled={updateLoading || !newGroupName.trim() || newGroupName === activeGroupForMenu?.name}
            sx={{
              borderRadius: '8px',
              bgcolor: '#B8860B',
              '&:hover': {
                bgcolor: '#9A7209',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(184, 134, 11, 0.12)',
              },
              textTransform: 'none',
              fontFamily: "'Nunito Sans', sans-serif"
            }}
          >
            {updateLoading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              'Rename'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarMessage.type}
          sx={{ width: '100%' }}
        >
          {snackbarMessage.message}
        </Alert>
      </Snackbar>

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={(layout, layouts) => handleLayoutChange(layout, layouts)}
        isDraggable={!fullscreenReport}
        isResizable={!fullscreenReport}
        margin={[20, 20]}
        draggableHandle=".drag-handle"
      >
        {currentUrls.map((url) => (
          <div key={url.id.toString()}>
            <Paper
              sx={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none'
              }}
            >
              <Box 
                sx={{ 
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  position: 'relative',
                  userSelect: 'none'
                }}
              >
                <Box 
                  className="drag-handle"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    cursor: 'move',
                    maxWidth: 'calc(100% - 80px)',
                    userSelect: 'none'
                  }}
                >
                  <DragIndicatorIcon sx={{ color: 'text.secondary' }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      fontFamily: "'Nunito Sans', sans-serif",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      userSelect: 'none'
                    }}
                  >
                    {url.title}
                  </Typography>
                </Box>

                <Box 
                  sx={{ 
                    display: 'flex',
                    gap: 1,
                    ml: 'auto',
                    pointerEvents: 'auto'
                  }}
                >
                  <Tooltip title="View fullscreen">
                    <IconButton 
                      size="small" 
                      onClick={() => handleFullscreen({ url: url.url, title: url.title })}
                      sx={{ color: '#B8860B' }}
                    >
                      <FullscreenIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove from favorites">
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteClick(selectedGroup, url.id, url.title)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ flex: 1, position: 'relative' }}>
                <iframe
                  title={url.title}
                  src={url.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              </Box>

              {url.filters && (
                <Box sx={{ 
                  p: 1.5,
                  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  userSelect: 'none'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      fontFamily: "'Nunito Sans', sans-serif",
                      fontSize: '0.875rem',
                      userSelect: 'none'
                    }}
                  >
                    Filters: {formatFilters(url.filters)}
                  </Typography>
                </Box>
              )}
            </Paper>
          </div>
        ))}
      </ResponsiveGridLayout>

      {selectedGroup && (!urls[selectedGroup] || urls[selectedGroup].length === 0) && (
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            textAlign: 'center', 
            mt: 4,
            fontStyle: 'italic',
            fontFamily: "'Nunito Sans', sans-serif"
          }}
        >
          No favorites in this group yet
        </Typography>
      )}

      {groups.length === 0 && (
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            textAlign: 'center', 
            mt: 4,
            fontStyle: 'italic',
            fontFamily: "'Nunito Sans', sans-serif"
          }}
        >
          You haven't created any favorite groups yet
        </Typography>
      )}
    </Box>
  );
};

export default FavoritesPage; 