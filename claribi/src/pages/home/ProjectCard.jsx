import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircleInfo,
  faShareNodes,
  faEllipsisVertical,
  faPenToSquare,
  faTrash,
  faXmark,
  faCopy
} from '@fortawesome/free-solid-svg-icons';
import { formatLastModified } from '../../utils/dateUtils';
import Modal from '../../components/ui/Modal';
import projectService from '../../services/projectService';
import { useNotification } from '../../contexts/NotificationContext';

const ProjectCard = ({ project, onEdit, onDelete, onToggleStatus }) => {
  const { id, name, status, description } = project;
  const navigate = useNavigate();
  
  // Format the lastModified date
  const lastModified = project.lastModified || formatLastModified(project.updated_at || project.created_at);
  
  // State for menu and modals
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);
  
  // State for edit form
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(project.description || '');
  
  // Mocked creation date for display purposes
  const creationDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const { showNotification } = useNotification();

  const handleProjectClick = () => {
    navigate(`/projects/${id}`);
  };
  
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };
  
  const handleDetailsClick = (event) => {
    event.stopPropagation();
    setDetailsModalOpen(true);
  };
  
  const handleShareClick = (event) => {
    event.stopPropagation();
    // Navigate to project detail page with access management view
    navigate(`/projects/${id}`, { state: { accessManagement: true } });
  };
  
  const handleEditClick = (event) => {
    if (event) event.stopPropagation();
    handleMenuClose(event);
    setEditModalOpen(true);
  };
  
  const handleDeleteClick = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    handleMenuClose(event);
    setDeleteDialogOpen(true);
  };
  
  const handleSaveEdit = () => {
    // Call the parent edit function with the updated data
    onEdit({
      ...project,
      name: editName,
      description: editDescription
    });
    setEditModalOpen(false);
  };
  
  const handleConfirmDelete = async () => {
    try {
      await onDelete();
      showNotification('Project deleted successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to delete project', 'error');
    }
    setDeleteDialogOpen(false);
  };
  
  const handleCopyShareLink = () => {
    // In a real app, this would be a proper sharing link
    const shareUrl = `${window.location.origin}/projects/${id}`;
    navigator.clipboard.writeText(shareUrl);
    // Show a toast or some feedback here
    setTimeout(() => setShareModalOpen(false), 1500);
  };

  const handleStatusMenuOpen = (event) => {
    event.stopPropagation();
    setStatusMenuAnchorEl(event.currentTarget);
  };

  const handleStatusMenuClose = (event) => {
    if (event) event.stopPropagation();
    setStatusMenuAnchorEl(null);
  };

  const handleStatusChange = async (newStatus) => {
    // Optimistically update UI
    onEdit({
      ...project,
      status: newStatus
    });
    handleStatusMenuClose();
    try {
      await projectService.updateProjectStatus(project.id, newStatus);
      showNotification && showNotification(`Project status updated to ${newStatus}`, 'success');
    } catch (err) {
      showNotification && showNotification('Failed to update project status', 'error');
      // Optionally, revert UI change here if needed
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2.5, 
        borderRadius: 0, 
        mb: 0,
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        backgroundColor: 'transparent',
        '&:hover': { 
          backgroundColor: 'rgba(238, 242, 246, 0.4)'
        },
        transition: 'background-color 0.2s ease',
        width: '100%',
        overflow: 'visible',
        cursor: 'pointer'
      }}
      onClick={handleProjectClick}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%',
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: { xs: '100%', sm: '30%' }
          }}
        >
          <Box sx={{ display: 'block', minWidth: 0, overflow: 'hidden', flexGrow: 1 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                '&:hover': { textDecoration: 'underline' },
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#333'
              }}
            >
              {name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  fontFamily: "'Inter', sans-serif", 
                  fontSize: '0.85rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {description || 'No description available'}
              </Typography>
              <Chip
                label={status || 'In Draft'}
                size="small"
                onClick={handleStatusMenuOpen}
                sx={{
                  backgroundColor: status === 'Live' ? '#4caf50' : status === 'Deleted' ? '#f44336' : '#ff9800',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: { xs: 'space-between', sm: 'flex-start' },
          width: { xs: '100%', sm: 'auto' }, 
          mt: { xs: 1, sm: 0 }
        }}>
          <Box sx={{ 
            flexShrink: 0, 
            width: '150px',
            textAlign: 'left' 
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem' }}>{lastModified}</Typography>
        </Box>
        
          <Box sx={{ display: 'flex', width: '120px', flexShrink: 0, justifyContent: 'flex-end' }}>
            <Tooltip title="Details">
              <IconButton 
                size="small" 
                onClick={handleDetailsClick} 
                sx={{ 
                  color: '#555555',
                  backgroundColor: 'transparent',
                  '&:hover': { 
                    backgroundColor: 'rgba(85, 85, 85, 0.1)',
                    color: '#FCC000'
                  },
                  margin: '0 2px',
                  width: 32,
                  height: 32
                }}
              >
                <FontAwesomeIcon icon={faCircleInfo} size="sm" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Access Management">
              <IconButton 
                size="small" 
                onClick={handleShareClick} 
                sx={{ 
                  color: '#555555',
                  backgroundColor: 'transparent',
                  '&:hover': { 
                    backgroundColor: 'rgba(85, 85, 85, 0.1)',
                    color: '#FCC000'
                  },
                  margin: '0 2px',
                  width: 32,
                  height: 32
                }}
              >
                <FontAwesomeIcon icon={faShareNodes} size="sm" />
              </IconButton>
            </Tooltip>
            <Tooltip title="More Options">
              <IconButton 
                size="small" 
                onClick={handleMenuOpen} 
                sx={{ 
                  color: '#555555',
                  backgroundColor: 'transparent',
                  '&:hover': { 
                    backgroundColor: 'rgba(85, 85, 85, 0.1)',
                    color: '#FCC000'
                  },
                  margin: '0 2px',
                  width: 32,
                  height: 32
                }}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} size="sm" />
              </IconButton>
            </Tooltip>
            
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
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
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
                onClick={handleEditClick}
                sx={{
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    '& .MuiListItemIcon-root': { color: '#FCC000' },
                    '& .MuiTypography-root': { color: '#FCC000' }
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faPenToSquare} size="sm" />
                </ListItemIcon>
                <ListItemText 
                  primary="Edit Project"
                  primaryTypographyProps={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500
                  }}  
                />
              </MenuItem>
              <MenuItem 
                onClick={handleDeleteClick}
                sx={{
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    '& .MuiListItemIcon-root': { color: '#FCC000' },
                    '& .MuiTypography-root': { color: '#FCC000' }
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faTrash} size="sm" />
                </ListItemIcon>
                <ListItemText 
                  primary="Delete Project"
                  primaryTypographyProps={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500
                  }}
                />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>
      
      {/* Project Details Modal */}
      <Modal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Project Details"
        contentSx={{ 
          width: { xs: '90%', sm: '500px' },
          maxWidth: '90vw',
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
        onBackdropClick={(e) => {
          e.stopPropagation();
          setDetailsModalOpen(false);
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontFamily: "'Inter', sans-serif" }}>
            Project Name
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            {name}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontFamily: "'Inter', sans-serif" }}>
            Description
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: "'Inter', sans-serif" }}>
            {project.description || 'No description provided.'}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontFamily: "'Inter', sans-serif" }}>
            Last Modified
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: "'Inter', sans-serif" }}>
            {lastModified}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontFamily: "'Inter', sans-serif" }}>
            Status
          </Typography>
          <Typography variant="body1" sx={{ 
            color: status === 'Running' ? '#4caf50' : '#f44336',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif"
          }}>
            {status}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={() => setDetailsModalOpen(false)}
            sx={{ 
              borderRadius: '8px',
              bgcolor: '#555555',
              '&:hover': { bgcolor: '#333333' },
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Close
          </Button>
        </Box>
      </Modal>
      
      {/* Share Modal */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Project"
        contentSx={{ 
          width: { xs: '90%', sm: '500px' },
          maxWidth: '90vw',
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
        }}
      >
        <Typography variant="body2" sx={{ mb: 3, fontFamily: "'Inter', sans-serif" }}>
          Share this project with your team members
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3, 
          p: 2, 
          borderRadius: '8px', 
          bgcolor: 'rgba(0, 0, 0, 0.05)' 
        }}>
          <Typography variant="body2" sx={{ flexGrow: 1, fontFamily: "monospace" }} noWrap>
            {`${window.location.origin}/projects/${id}`}
          </Typography>
          <IconButton 
            onClick={handleCopyShareLink} 
            size="small" 
            sx={{ 
              color: '#555555',
              backgroundColor: 'rgba(85, 85, 85, 0.08)',
              '&:hover': { 
                backgroundColor: 'rgba(85, 85, 85, 0.15)',
                color: '#FCC000'
              },
              width: 32,
              height: 32
            }}
          >
            <FontAwesomeIcon icon={faCopy} size="sm" />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleCopyShareLink}
            startIcon={<FontAwesomeIcon icon={faCopy} />}
            sx={{ 
              borderRadius: '8px',
              bgcolor: '#555555',
              '&:hover': { bgcolor: '#333333' },
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Copy Link
          </Button>
        </Box>
      </Modal>
      
      {/* Edit Project Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Project"
        contentSx={{ 
          width: { xs: '90%', sm: '500px' },
          maxWidth: '90vw',
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
        onBackdropClick={(e) => {
          e.stopPropagation();
          setEditModalOpen(false);
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Project Name
          </Typography>
          <TextField
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter project name"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: "'Inter', sans-serif"
              },
              '& .MuiInputLabel-root': {
                fontFamily: "'Inter', sans-serif"
              },
              '& .MuiInputBase-input': {
                fontFamily: "'Inter', sans-serif"
              }
            }}
          />
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Description
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Enter project description"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: "'Inter', sans-serif"
              },
              '& .MuiInputLabel-root': {
                fontFamily: "'Inter', sans-serif"
              },
              '& .MuiInputBase-input': {
                fontFamily: "'Inter', sans-serif"
              }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setEditModalOpen(false)}
            sx={{ 
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!editName.trim()}
            sx={{ 
              borderRadius: '8px',
              bgcolor: '#555555',
              '&:hover': {
                bgcolor: '#333333'
              },
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Project"
        contentSx={{ 
          width: { xs: '90%', sm: '500px' },
          maxWidth: '90vw',
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ mb: 2, color: '#d32f2f', fontWeight: 600 }}>
            Warning: This action cannot be undone
          </Typography>
          <Typography>
            Are you sure you want to delete the project "{name}"? This will permanently remove the project and all its associated data.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            sx={{ 
              borderRadius: '8px',
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c',
              }
            }}
          >
            Delete Project
          </Button>
        </Box>
      </Modal>

      {/* Status Menu */}
      <Menu
        anchorEl={statusMenuAnchorEl}
        open={Boolean(statusMenuAnchorEl)}
        onClose={handleStatusMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            mt: 1,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: '120px'
          }
        }}
      >
        <MenuItem 
          onClick={() => handleStatusChange('Live')}
          sx={{
            color: status === 'Live' ? '#4caf50' : 'inherit',
            fontWeight: status === 'Live' ? 600 : 400
          }}
        >
          Live
        </MenuItem>
        <MenuItem 
          onClick={() => handleStatusChange('In Draft')}
          sx={{
            color: status === 'In Draft' ? '#ff9800' : 'inherit',
            fontWeight: status === 'In Draft' ? 600 : 400
          }}
        >
          In Draft
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ProjectCard;