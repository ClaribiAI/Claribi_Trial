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
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircleInfo,
  faEllipsisVertical,
  faSignOut,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { formatLastModified } from '../../utils/dateUtils';
import { useProjects } from '../../contexts/ProjectContext';
import { useNotification } from '../../contexts/NotificationContext';

const UserProjectCard = ({ project }) => {
  const { id, name, status, description, access_type } = project;
  const navigate = useNavigate();
  const { leaveProject } = useProjects();
  const { showNotification } = useNotification();
  
  // Format the lastModified date
  const lastModified = project.lastModified || formatLastModified(project.updated_at || project.created_at);
  
  // State for menu and modals
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  
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
  
  const handleLeaveClick = (event) => {
    if (event) event.stopPropagation();
    handleMenuClose(event);
    if (access_type === 'owner') {
      showNotification('You cannot leave this project as you are the owner', 'error');
      return;
    }
    setLeaveDialogOpen(true);
  };
  
  const handleConfirmLeave = async () => {
    try {
      const success = await leaveProject(id);
      if (success) {
        showNotification('Successfully left the project', 'success');
      }
    } catch (error) {
      showNotification(error.message || 'Failed to leave project', 'error');
    }
    setLeaveDialogOpen(false);
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
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontFamily: "'Inter', sans-serif", 
                fontSize: '0.85rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}
            >
              {description || 'No description available'}
            </Typography>
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
                onClick={handleLeaveClick}
                sx={{
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    '& .MuiListItemIcon-root': { color: '#FCC000' },
                    '& .MuiTypography-root': { color: '#FCC000' }
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faSignOut} size="sm" />
                </ListItemIcon>
                <ListItemText 
                  primary="Leave Project"
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
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        aria-labelledby="project-details-title"
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: 500
          }
        }}
      >
        <DialogTitle id="project-details-title" sx={{ fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
          Project Details
          <IconButton 
            onClick={() => setDetailsModalOpen(false)} 
            sx={{
              position: 'absolute',
              right: 16,
              top: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.1)' },
              width: 32,
              height: 32
            }}
          >
            <FontAwesomeIcon icon={faXmark} size="sm" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
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
              {description || 'No description provided.'}
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
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setDetailsModalOpen(false)}
            sx={{ 
              borderRadius: '12px',
              px: 3,
              py: 1,
              bgcolor: '#555555',
              '&:hover': { bgcolor: '#333333' },
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Leave Confirmation Dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        aria-labelledby="leave-dialog-title"
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: 400
          }
        }}
      >
        <DialogTitle id="leave-dialog-title" sx={{ fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
          Leave Project?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontFamily: "'Inter', sans-serif" }}>
            Are you sure you want to leave "{name}"? You will lose access to this project.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setLeaveDialogOpen(false)} 
            sx={{ 
              borderRadius: '12px', 
              px: 3,
              py: 1,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmLeave} 
            variant="contained" 
            color="error"
            sx={{ 
              borderRadius: '12px', 
              px: 3,
              py: 1,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Leave Project
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserProjectCard; 