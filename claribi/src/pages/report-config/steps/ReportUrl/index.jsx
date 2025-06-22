import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
  Modal,
  Menu,
  MenuItem,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNotification } from '../../../../contexts/NotificationContext';
import reportConfigService from '../../../../services/reportConfigService';

const ReportUrl = ({ projectId, reportId, config, setHasUnsavedChanges, onNextStep, fetchConfigData }) => {
  const [loading, setLoading] = useState(false);
  const [reportPages, setReportPages] = useState([]);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageUrl, setNewPageUrl] = useState('');
  const [newPageDescription, setNewPageDescription] = useState('');
  const [urlError, setUrlError] = useState('');
  const [editingPage, setEditingPage] = useState(null);
  const [isEditPageModalOpen, setIsEditPageModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const { showNotification } = useNotification();

  // Update pages when config changes
  useEffect(() => {
    if (config) {
      if (config.report_pages && Array.isArray(config.report_pages)) {
        const normalizedPages = config.report_pages.map(page => ({
          ...page,
          page_name: page.page_name || page.name || '',
          page_description: page.page_description || page.description || '',
          page_url: page.page_url || page.url || '',
        }));
        setReportPages(normalizedPages);
      } else if (config.report_url && Array.isArray(config.report_url)) {
        const normalizedPages = config.report_url.map(page => ({
          ...page,
          page_name: page.page_name || page.name || '',
          page_description: page.page_description || page.description || '',
          page_url: page.page_url || page.url || '',
        }));
        setReportPages(normalizedPages);
      }
    }
  }, [config]);

  const validatePowerBiUrl = (url) => {
    if (!url) return false;
    return url.trim().startsWith('https://app.powerbi.com/');
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setNewPageUrl(url);
    
    if (url && !validatePowerBiUrl(url)) {
      setUrlError('URL must start with https://app.powerbi.com/');
    } else {
      setUrlError('');
    }
  };

  const handleSaveReportUrl = async () => {
    try {
      setLoading(true);
      
      const pageData = {
        name: newPageName,
        url: newPageUrl,
        description: newPageDescription
      };
      
      const response = await reportConfigService.saveReportPage(projectId, reportId, pageData);
      
      if (response?.data?.success) {
        // Refresh the list of pages
        await fetchConfigData();
        handleCloseAddPageModal();
        showNotification('Page added successfully', 'success');
        setHasUnsavedChanges(false);
      } else {
        // Check for duplicate URL error
        if (response?.data?.error?.includes('already exists')) {
          showNotification('A page with this URL already exists', 'error');
        } else {
          showNotification(response?.data?.error || 'Failed to add page', 'error');
        }
      }
    } catch (err) {
      // Check for duplicate URL error in the error response
      if (err.response?.data?.error?.includes('already exists')) {
        showNotification('A page with this URL already exists', 'error');
      } else {
        showNotification(`Error adding page: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddPage = async () => {
    // Validate required fields
    if (!newPageName.trim()) {
      showNotification('Page name is required', 'error');
      return;
    }
    
    // Validate URL format
    if (!newPageUrl.trim()) {
      showNotification('Report URL is required', 'error');
      return;
    }
    
    if (!validatePowerBiUrl(newPageUrl)) {
      showNotification('URL must start with https://app.powerbi.com/', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const pageData = {
        name: newPageName,
        url: newPageUrl,
        description: newPageDescription
      };
      
      const response = await reportConfigService.saveReportPage(projectId, reportId, pageData);
      
      if (response?.data?.success) {
        // Refresh the config data to get the updated pages
        await fetchConfigData();
        handleCloseAddPageModal();
        showNotification('Page added successfully', 'success');
      } else {
        // Check for duplicate URL error
        if (response?.data?.error?.includes('already exists')) {
          showNotification('A page with this URL already exists', 'error');
        } else {
          showNotification(response?.data?.error || 'Failed to add page', 'error');
        }
      }
    } catch (err) {
      // Check for duplicate URL error in the error response
      if (err.response?.data?.error?.includes('already exists')) {
        showNotification('A page with this URL already exists', 'error');
      } else {
        showNotification(`Error adding page: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = (url) => {
    window.open(url, '_blank');
  };

  const handleDeletePage = async (pageId) => {
    try {
      setLoading(true);
      const response = await reportConfigService.deleteReportPage(projectId, reportId, pageId);
      
      if (response?.data?.success) {
        setReportPages(reportPages.filter(page => page.id !== pageId));
        showNotification('Report URL deleted successfully', 'success');
      } else {
        showNotification(response?.data?.error || 'Failed to delete report URL', 'error');
      }
    } catch (err) {
      showNotification(`Error deleting report URL: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    try {
      await handleSaveReportUrl();
      onNextStep();
    } catch (error) {
      console.error('Error proceeding to next step:', error);
    }
  };

  const handleOpenAddPageModal = () => {
    setIsAddPageModalOpen(true);
  };

  const handleCloseAddPageModal = () => {
    setIsAddPageModalOpen(false);
    setNewPageName('');
    setNewPageUrl('');
    setNewPageDescription('');
    setUrlError('');
  };

  const handleEditPage = (page) => {
    setEditingPage({
      id: page.id,
      name: page.page_name,
      url: page.page_url,
      description: page.page_description
    });
    setIsEditPageModalOpen(true);
  };

  const handleSaveEditPage = async (pageId) => {
    // Validate required fields
    if (!editingPage.name.trim()) {
      showNotification('Page name is required', 'error');
      return;
    }
    
    // Validate URL format
    if (!editingPage.url.trim()) {
      showNotification('Report URL is required', 'error');
      return;
    }
    
    if (!validatePowerBiUrl(editingPage.url)) {
      showNotification('URL must start with https://app.powerbi.com/', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const pageData = {
        name: editingPage.name,
        url: editingPage.url,
        description: editingPage.description,
        id: editingPage.id,
        is_update: true
      };
      
      const response = await reportConfigService.editReportPage(projectId, reportId, pageId, pageData);
      
      if (response?.data?.success) {
        showNotification('Page edited successfully', 'success');
        // Refresh the list of pages
        await fetchConfigData();
        handleCloseEditPageModal();
      } else {
        // Check for duplicate URL error
        if (response?.data?.error?.includes('already exists')) {
          showNotification('A page with this URL already exists', 'error');
        } else {
          showNotification(response?.data?.error || 'Failed to edit page', 'error');
        }
      }
    } catch (err) {
      // Check for duplicate URL error in the error response
      if (err.response?.data?.error?.includes('already exists')) {
        showNotification('A page with this URL already exists', 'error');
      } else {
        showNotification(`Error editing page: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditPageChange = (field, value) => {
    setEditingPage(prev => {
      const updated = { ...prev, [field]: value };
      
      // Validate URL if it's being changed
      if (field === 'url' && value && !validatePowerBiUrl(value)) {
        setUrlError('URL must start with https://app.powerbi.com/');
      } else if (field === 'url') {
        setUrlError('');
      }
      
      return updated;
    });
  };

  const handleCloseEditPageModal = () => {
    setEditingPage(null);
    setIsEditPageModalOpen(false);
    setUrlError('');
  };

  const handleMenuOpen = (event, page) => {
    setAnchorEl(event.currentTarget);
    setSelectedPage(page);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPage(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    handleEditPage(selectedPage);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    handleDeletePage(selectedPage.id);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#555555' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Nunito Sans", sans-serif',
              color: '#555555',
              mb: 3
            }}
          >
            Report URL
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#555555' }} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleOpenAddPageModal}
                  sx={{
                    bgcolor: '#555555',
                    '&:hover': { bgcolor: '#333333' },
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '8px',
                    px: 3,
                    py: 1,
                    fontFamily: "'Nunito Sans', sans-serif",
                  }}
                >
                  Add Page
                </Button>
              </Box>

              {reportPages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  p: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 2
                }}>
                  <Typography sx={{ 
                    color: '#666666',
                    mb: 2,
                    fontFamily: "'Nunito Sans', sans-serif"
                  }}>
                    No report pages added yet
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={handleOpenAddPageModal}
                    sx={{
                      bgcolor: '#555555',
                      '&:hover': { bgcolor: '#333333' },
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      px: 3,
                      py: 1,
                      fontFamily: "'Nunito Sans', sans-serif",
                    }}
                  >
                    Add Page
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {reportPages.map((page, index) => (
                    <Card key={page.id || index} sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '&:last-child': { pb: 2 }
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ 
                            fontFamily: "'Nunito Sans', sans-serif",
                            fontWeight: 600,
                            color: '#555555',
                            mb: 1
                          }}>
                            {page.page_name}
                          </Typography>
                          {page.page_description && (
                            <Typography sx={{ 
                              color: '#666666',
                              mb: 2,
                              fontFamily: "'Nunito Sans', sans-serif"
                            }}>
                              {page.page_description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              sx={{ 
                                color: '#666666',
                                fontSize: '0.875rem',
                                fontFamily: "'Nunito Sans', sans-serif"
                              }}
                              noWrap
                            >
                              {page.page_url}
                            </Typography>
                            <Tooltip title="Open in new tab">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenUrl(page.page_url)}
                                sx={{
                                  color: '#555555',
                                  '&:hover': { color: '#FCC000' }
                                }}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            onClick={(event) => handleMenuOpen(event, page)}
                            sx={{
                              color: '#555555',
                              '&:hover': { color: '#FCC000' }
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Add Page Modal */}
      <Modal
        open={isAddPageModalOpen}
        onClose={handleCloseAddPageModal}
        aria-labelledby="add-page-modal-title"
      >
        <Paper sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 600,
          p: 4,
          outline: 'none',
          borderRadius: 2,
          boxShadow: 24,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" id="add-page-modal-title" sx={{ 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Add New Page
            </Typography>
            <IconButton onClick={handleCloseAddPageModal} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Page Name <span style={{ color: '#f44336' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              label="Page Name"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: '"Nunito Sans", sans-serif',
                },
                '& .MuiInputLabel-root': {
                  fontFamily: '"Nunito Sans", sans-serif',
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Power BI Report URL <span style={{ color: '#f44336' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              value={newPageUrl}
              onChange={handleUrlChange}
              error={Boolean(urlError)}
              helperText={urlError}
              placeholder="https://app.powerbi.com/..."
              required
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontFamily: "'Nunito Sans', sans-serif"
                },
                '& .MuiFormHelperText-root': {
                  fontFamily: "'Nunito Sans', sans-serif"
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={newPageDescription}
              onChange={(e) => setNewPageDescription(e.target.value)}
              placeholder="Enter page description"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontFamily: "'Nunito Sans', sans-serif"
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCloseAddPageModal}
              sx={{
                color: '#555555',
                borderColor: '#555555',
                '&:hover': {
                  borderColor: '#333333',
                  bgcolor: 'rgba(85, 85, 85, 0.04)'
                },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddPage}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AddRoundedIcon />}
              sx={{
                fontFamily: '"Nunito Sans", sans-serif',
                backgroundColor: '#555555',
                '&:hover': {
                  backgroundColor: '#333333',
                },
                borderRadius: '8px',
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              {loading ? 'Adding...' : 'Add Page'}
            </Button>
          </Box>
        </Paper>
      </Modal>

      {/* Edit Page Modal */}
      <Modal
        open={isEditPageModalOpen}
        onClose={handleCloseEditPageModal}
        aria-labelledby="edit-page-modal-title"
      >
        <Paper sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 600,
          p: 4,
          outline: 'none',
          borderRadius: 2,
          boxShadow: 24,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" id="edit-page-modal-title" sx={{ 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Edit Page
            </Typography>
            <IconButton onClick={handleCloseEditPageModal} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Page Name <span style={{ color: '#f44336' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              value={editingPage?.name || ''}
              onChange={(e) => handleEditPageChange('name', e.target.value)}
              placeholder="Enter page name"
              required
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontFamily: "'Nunito Sans', sans-serif"
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Power BI Report URL <span style={{ color: '#f44336' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              value={editingPage?.url || ''}
              onChange={(e) => handleEditPageChange('url', e.target.value)}
              error={Boolean(urlError)}
              helperText={urlError}
              placeholder="https://app.powerbi.com/..."
              required
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontFamily: "'Nunito Sans', sans-serif"
                },
                '& .MuiFormHelperText-root': {
                  fontFamily: "'Nunito Sans', sans-serif"
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif"
            }}>
              Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editingPage?.description || ''}
              onChange={(e) => handleEditPageChange('description', e.target.value)}
              placeholder="Enter page description"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontFamily: "'Nunito Sans', sans-serif"
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCloseEditPageModal}
              sx={{
                color: '#555555',
                borderColor: '#555555',
                '&:hover': {
                  borderColor: '#333333',
                  bgcolor: 'rgba(85, 85, 85, 0.04)'
                },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSaveEditPage(editingPage.id)}
              disabled={!editingPage?.name || !editingPage?.url || Boolean(urlError)}
              sx={{
                bgcolor: '#555555',
                '&:hover': { bgcolor: '#333333' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(85, 85, 85, 0.12)',
                },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Paper>
      </Modal>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          '& .MuiMenuItem-root': {
            fontFamily: '"Nunito Sans", sans-serif',
          }
        }}
      >
        <MenuItem onClick={handleEditClick} sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
          <EditRoundedIcon fontSize="small" sx={{ mr: 1, color: '#555555' }} />
          Edit Page
        </MenuItem>
        <MenuItem 
          onClick={handleDeleteClick} 
          sx={{ 
            color: '#f44336',
            fontFamily: "'Nunito Sans', sans-serif",
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.08)'
            }
          }}
        >
          <DeleteRoundedIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Page
        </MenuItem>
      </Menu>
    </Box>
  );
};

ReportUrl.propTypes = {
  projectId: PropTypes.string.isRequired,
  reportId: PropTypes.string.isRequired,
  config: PropTypes.object,
  setHasUnsavedChanges: PropTypes.func.isRequired,
  onNextStep: PropTypes.func.isRequired,
  fetchConfigData: PropTypes.func.isRequired,
};

ReportUrl.defaultProps = {
  config: null,
};

export default ReportUrl; 