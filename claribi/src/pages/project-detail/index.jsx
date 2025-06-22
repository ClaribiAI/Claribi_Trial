import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  IconButton,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrash, faArrowLeft, faShareNodes, faUsers, faLink, faCopy } from '@fortawesome/free-solid-svg-icons';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TimerIcon from '@mui/icons-material/Timer';
import Modal from '../../components/ui/Modal';
import RoleBasedComponent from '../../components/auth/RoleBasedComponent';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import UserProjectDetails from './UserProjectDetails';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ShareProjectModal from '../../components/projects/ShareProjectModal';
import { useNotification } from '../../contexts/NotificationContext';
import reportService from '../../services/reportService';
import projectService from '../../services/projectService';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { fetchProject, currentProject, loading, error } = useProjects();
  const { showNotification } = useNotification();
  const location = useLocation();
  
  // State for reports
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  
  // State for modals
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [isEditReportModalOpen, setIsEditReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  // State for view management
  const [currentView, setCurrentView] = useState('reports'); // 'reports' or 'access-management'
  
  // State for share links
  const [sharedLinks, setSharedLinks] = useState({
    co_owner: [],
    reader: []
  });
  
  // State for the revoke confirmation dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [linkToRevoke, setLinkToRevoke] = useState({ id: '', type: '' });
  const [removeUsers, setRemoveUsers] = useState(false);
  
  // States for time adjustment dialog
  const [timeAdjustmentDialogOpen, setTimeAdjustmentDialogOpen] = useState(false);
  const [linkToAdjust, setLinkToAdjust] = useState({ id: '', type: '', expiresIn: 0 });
  const [newExpiryTime, setNewExpiryTime] = useState(0);
  
  // State for status menu
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState(null);
  
  // Add new state for copy report modal
  const [isCopyReportModalOpen, setIsCopyReportModalOpen] = useState(false);
  const [reportToCopy, setReportToCopy] = useState(null);
  const [isCopyingReport, setIsCopyingReport] = useState(false);
  
  // Add new state for project selection
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedTargetProject, setSelectedTargetProject] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Check if we should navigate to access management
  useEffect(() => {
    if (location.state?.accessManagement) {
      setCurrentView('access-management');
      // Clear the state to prevent repeated navigations
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);
  
  // Fetch project data from API
  useEffect(() => {
    let isMounted = true;
    
    const loadProject = async () => {
      if (!projectId || !isMounted) return;
      
      // Only fetch if we don't have the project data or if it's a different project
      if (!currentProject || currentProject.id !== parseInt(projectId)) {
        await fetchProject(projectId);
      }
    };
    
    loadProject();
    
    return () => {
      isMounted = false;
    };
  }, [projectId, currentProject, fetchProject]);
  
  // Fetch reports from API
  useEffect(() => {
    let isMounted = true;
    let timeoutId;
    
    const fetchReports = async () => {
      if (!projectId || !isMounted || reportsLoading) return;
      
      try {
        setReportsLoading(true);
        setReportsError(null);
        
        const response = await reportService.getReports(projectId);
        
        if (!isMounted) return;
        
        if (response && response.data) {
          if (response.data.success) {
            console.log('Reports fetched successfully:', response.data.reports);
            setReports(response.data.reports || []);
          } else {
            setReportsError(response.data.error || 'Failed to fetch reports');
            setReports([]);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching reports:', err);
        setReportsError(err.message || 'Failed to fetch reports');
        setReports([]);
      } finally {
        if (isMounted) {
          setReportsLoading(false);
        }
      }
    };
    
    // Add a small delay to prevent rapid refetches
    timeoutId = setTimeout(fetchReports, 100);
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [projectId]);
  
  // Initial fetch effect - handle initial load
  useEffect(() => {
    // This is the initial fetch for when the page loads/project changes
    const fetchSharedLinks = async () => {
      if (!projectId) return;
      
      // Only fetch links if we're on the access-management view
      if (currentView !== 'access-management') {
        return;
      }
      
      try {
        const response = await projectService.getProjectSharingInfo(projectId);
        
        if (response && response.data) {
          const formattedLinks = {
            co_owner: [],
            reader: []
          };
          
          // Process share_urls - arrays of link objects
          if (response.data.share_urls) {
            // Process co_owner URLs if available
            if (response.data.share_urls.co_owner && Array.isArray(response.data.share_urls.co_owner)) {
              response.data.share_urls.co_owner.forEach(linkObj => {
                if (linkObj && linkObj.url) {
                  formattedLinks.co_owner.push({
                    id: linkObj.id || 'co_owner_' + Date.now(),
                    link: linkObj.url,
                    expiresIn: calculateExpirationHours(linkObj.expires_at),
                    usersCount: linkObj.access_count || 0
                  });
                }
              });
            }
            
            // Process reader URLs if available
            if (response.data.share_urls.reader && Array.isArray(response.data.share_urls.reader)) {
              response.data.share_urls.reader.forEach(linkObj => {
                if (linkObj && linkObj.url) {
                  formattedLinks.reader.push({
                    id: linkObj.id || 'reader_' + Date.now(),
                    link: linkObj.url,
                    expiresIn: calculateExpirationHours(linkObj.expires_at),
                    usersCount: linkObj.access_count || 0
                  });
                }
              });
            }
          }
          
          setSharedLinks(formattedLinks);
        }
      } catch (err) {
        showNotification('Failed to fetch shared links', 'error');
      }
    };
    
    fetchSharedLinks();
  }, [projectId, currentView]);
  
  // View change effect - update with the logic to handle multiple share URLs
  useEffect(() => {
    // When view changes to access-management, fetch sharing info
    if (currentView === 'access-management') {
      const fetchSharedLinks = async () => {
        if (projectId) {
          try {
            const response = await projectService.getProjectSharingInfo(projectId);
            
            if (response && response.data) {
              const formattedLinks = {
                co_owner: [],
                reader: []
              };
              
              // Process share_urls - arrays of link objects
              if (response.data.share_urls) {
                // Process co_owner URLs if available
                if (response.data.share_urls.co_owner && Array.isArray(response.data.share_urls.co_owner)) {
                  response.data.share_urls.co_owner.forEach(linkObj => {
                    if (linkObj && linkObj.url) {
                      formattedLinks.co_owner.push({
                        id: linkObj.id || 'co_owner_' + Date.now(),
                        link: linkObj.url,
                        expiresIn: calculateExpirationHours(linkObj.expires_at),
                        usersCount: linkObj.access_count || 0
                      });
                    }
                  });
                }
                
                // Process reader URLs if available
                if (response.data.share_urls.reader && Array.isArray(response.data.share_urls.reader)) {
                  response.data.share_urls.reader.forEach(linkObj => {
                    if (linkObj && linkObj.url) {
                      formattedLinks.reader.push({
                        id: linkObj.id || 'reader_' + Date.now(),
                        link: linkObj.url,
                        expiresIn: calculateExpirationHours(linkObj.expires_at),
                        usersCount: linkObj.access_count || 0
                      });
                    }
                  });
                }
              }
              
              setSharedLinks(formattedLinks);
            }
          } catch (err) {
            showNotification('Failed to fetch shared links', 'error');
          }
        }
      };
      
      fetchSharedLinks();
    }
  }, [currentView, projectId]);

  // Add effect to fetch available projects when copy modal opens
  useEffect(() => {
    const fetchProjects = async () => {
      if (isCopyReportModalOpen) {
        try {
          setLoadingProjects(true);
          const response = await projectService.getProjects();
          // Filter out current project and only include projects where user is owner/co-owner
          const filteredProjects = response.items.filter(p => 
            p.id !== projectId && ['owner', 'co_owner'].includes(p.access_type)
          );
          setAvailableProjects(filteredProjects);
        } catch (error) {
          console.error('Error fetching projects:', error);
        } finally {
          setLoadingProjects(false);
        }
      }
    };
    fetchProjects();
  }, [isCopyReportModalOpen, projectId]);

  const handleBackToProjects = () => {
    navigate('/projects');
  };
  
  const handleAddReport = () => {
    setIsAddReportModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsAddReportModalOpen(false);
    setIsEditReportModalOpen(false);
    setIsCopyReportModalOpen(false);
    setReportName('');
    setReportDescription('');
    setSetAsDefault(false);
    setIsCreatingReport(false);
    setIsCopyingReport(false);
    setEditingReportId(null);
    setReportToCopy(null);
    setSelectedTargetProject('');
  };
  
  const handleCreateReport = async () => {
    if (reportName.trim() && !isCreatingReport) {
      try {
        setIsCreatingReport(true);
        const reportData = {
          name: reportName,
          description: reportDescription || '',
          default_report: setAsDefault
        };
        
        const response = await reportService.createReport(projectId, reportData);
        
        if (response && response.data && response.data.success) {
          // Fetch the updated list of reports
          const reportsResponse = await reportService.getReports(projectId);
          if (reportsResponse && reportsResponse.data && reportsResponse.data.success) {
            setReports(reportsResponse.data.reports || []);
          }
          
          handleCloseModal();
          showNotification('Report created successfully!', 'success');
        } else {
          throw new Error(response?.data?.error || 'Failed to create report');
        }
      } catch (err) {
        console.error('Failed to create report:', err);
        showNotification(err.message || 'Failed to create report', 'error');
      } finally {
        setIsCreatingReport(false);
      }
    }
  };
  
  const handleDeleteReport = async (reportId) => {
    try {
      const response = await reportService.deleteReport(projectId, reportId);
      
      if (response && response.data && response.data.success) {
        // Update the UI immediately by filtering out the deleted report
        setReports(reports.filter(report => report.id !== reportId));
        showNotification('Report deleted successfully!', 'success');
      } else {
        throw new Error(response?.data?.error || 'Failed to delete report');
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
      showNotification(err.message || 'Failed to delete report', 'error');
    }
  };
  
  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setIsDeleteModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (reportToDelete) {
      await handleDeleteReport(reportToDelete.id);
      setIsDeleteModalOpen(false);
      setReportToDelete(null);
    }
  };
  
  const handleEditReport = (reportId) => {
    const reportToEdit = reports.find(report => report.id === reportId);
    if (reportToEdit) {
      setEditingReportId(reportId);
      setReportName(reportToEdit.name || '');
      setReportDescription(reportToEdit.description || '');
      setSetAsDefault(reportToEdit.default_report || false);
      setIsEditReportModalOpen(true);
    } else {
      showNotification('Report not found', 'error');
    }
  };
  
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const response = await reportService.updateReportStatus(projectId, reportId, newStatus);
      
      if (response && response.data && response.data.success) {
        // Update the reports list with the new status
        setReports(reports.map(report => 
          report.id === reportId ? { ...report, status: newStatus } : report
        ));
        showNotification(`Report status updated to ${newStatus}`, 'success');
      } else {
        throw new Error(response?.data?.error || 'Failed to update report status');
      }
    } catch (err) {
      console.error('Failed to update report status:', err);
      // Check for specific validation errors
      if (err.message.includes('At least one field must be selected')) {
        showNotification('Cannot set report to Live: You must select at least one field in the Field Selection step', 'error');
      } else if (err.message.includes('At least one report page must be maintained')) {
        showNotification('Cannot set report to Live: You must add at least one report page in the Report URL step', 'error');
      } else if (err.message.includes('Cannot set report to Live when project is not Live')) {
        showNotification('Cannot set report to Live: The project must be Live first', 'error');
      } else {
        showNotification(err.message || 'Failed to update report status', 'error');
      }
    }
  };
  
  const handleSaveEdit = async () => {
    if (!editingReportId || !reportName.trim()) return;
    
    try {
      const reportData = {
        new_name: reportName,
        new_description: reportDescription || '',
        default_report: setAsDefault
      };
      
      const response = await reportService.editReport(projectId, editingReportId, reportData);
      
      if (response && response.data && response.data.success) {
        // Fetch the updated list of reports
        const reportsResponse = await reportService.getReports(projectId);
        if (reportsResponse && reportsResponse.data && reportsResponse.data.success) {
          setReports(reportsResponse.data.reports || []);
        }
        
        handleCloseModal();
        showNotification('Report updated successfully!', 'success');
      } else {
        throw new Error(response?.data?.error || 'Failed to update report');
      }
    } catch (err) {
      console.error('Failed to update report:', err);
      showNotification(err.message || 'Failed to update report', 'error');
    }
  };
  
  const handleSetDefault = async (reportId) => {
    try {
      const reportToEdit = reports.find(report => report.id === reportId);
      if (!reportToEdit) {
        throw new Error('Report not found');
      }
      
      const reportData = {
        new_name: reportToEdit.name,
        new_description: reportToEdit.description || '',
        default_report: true,
        project_id: projectId
      };
      
      const response = await reportService.editReport(reportId, reportData);
      
      if (response && response.data && response.data.success) {
        // Fetch the updated list of reports
        const reportsResponse = await reportService.getReports(projectId);
        if (reportsResponse && reportsResponse.data && reportsResponse.data.success) {
          setReports(reportsResponse.data.reports || []);
        }
        
        showNotification('Default report updated', 'success');
      } else {
        throw new Error(response?.data?.error || 'Failed to update report');
      }
    } catch (err) {
      console.error('Failed to set default report:', err);
      showNotification(err.message || 'Failed to set default report', 'error');
    }
  };
  
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };
  
  // Handle revoking a share link
  const handleRevokeLink = (id, type) => {
    setLinkToRevoke({ id, type });
    setRemoveUsers(false); // Initialize checkbox as unchecked
    setRevokeDialogOpen(true);
  };
  
  const handleRevokeLinkConfirm = async () => {
    if (linkToRevoke.id && linkToRevoke.type) {
      try {
        // Immediately update the UI to remove the link for better UX
        setSharedLinks(prev => ({
          ...prev,
          [linkToRevoke.type]: prev[linkToRevoke.type].filter(link => link.id !== linkToRevoke.id)
        }));
        
        // Call API to revoke the link - pass the link ID as the fourth parameter
        const response = await projectService.revokeProjectShare(
          projectId, 
          removeUsers, // use the removeUsers state to determine if we should revoke access
          linkToRevoke.type === 'co_owner' ? 'co_owner' : 'reader',
          linkToRevoke.id // Pass the link ID to revoke only this specific link
        );
        
        // Check if the API call was successful
        const success = response && (
          response.success || 
          response.data?.success ||
          response.status === 200 ||
          response.status === 201 ||
          response.status === 204
        );
        
        if (success) {
          showNotification(`Share link revoked${removeUsers ? ' and user access removed' : ''} successfully`, 'success');
        } else {
          showNotification('Share link was removed from UI, but server may have issues', 'warning');
        }
      } catch (err) {
        // We keep the UI updated even if the API call fails
        showNotification('Link removed from UI, but server reported an error', 'warning');
      } finally {
        setRevokeDialogOpen(false);
        setLinkToRevoke({ id: '', type: '' });
        setRemoveUsers(false);
      }
    }
  };
  
  const handleShareSuccess = (shareData) => {
    // After getting a successful share result, update the shared links
    if (shareData) {
      // Refresh the links completely to ensure consistency
      if (projectId) {
        projectService.getProjectSharingInfo(projectId)
          .then(response => {
            if (response && response.data) {
              const formattedLinks = {
                co_owner: [],
                reader: []
              };
              
              // Process share_urls arrays
              if (response.data.share_urls) {
                // Process co_owner URLs if available as an array
                if (response.data.share_urls.co_owner && Array.isArray(response.data.share_urls.co_owner)) {
                  response.data.share_urls.co_owner.forEach(linkObj => {
                    if (linkObj && linkObj.url) {
                      formattedLinks.co_owner.push({
                        id: linkObj.id || 'co_owner_' + Date.now(),
                        link: linkObj.url,
                        expiresIn: calculateExpirationHours(linkObj.expires_at),
                        usersCount: linkObj.access_count || 0
                      });
                    }
                  });
                }
                
                // Process reader URLs if available as an array
                if (response.data.share_urls.reader && Array.isArray(response.data.share_urls.reader)) {
                  response.data.share_urls.reader.forEach(linkObj => {
                    if (linkObj && linkObj.url) {
                      formattedLinks.reader.push({
                        id: linkObj.id || 'reader_' + Date.now(),
                        link: linkObj.url,
                        expiresIn: calculateExpirationHours(linkObj.expires_at),
                        usersCount: linkObj.access_count || 0
                      });
                    }
                  });
                }
              }
              
              setSharedLinks(formattedLinks);
            }
          })
          .catch(err => {
            // Fallback to adding just the newly shared link
            if (shareData.url && shareData.accessType) {
              const newLink = {
                id: String(Date.now()),
                link: shareData.url,
                expiresIn: shareData.expirationHours || 24,
                usersCount: 0
              };
              
              const linkType = shareData.accessType === 'co_owner' ? 'co_owner' : 'reader';
              
              setSharedLinks(prev => ({
                ...prev,
                [linkType]: [...prev[linkType], newLink]
              }));
            }
          });
      }
    }
    
    setIsShareModalOpen(false);
  };
  
  // Helper function to calculate hours until expiration
  const calculateExpirationHours = (expiresAt) => {
    if (!expiresAt) return 24; // Default
    
    try {
      const expiresAtDate = new Date(expiresAt);
      const now = new Date();
      const hoursLeft = Math.ceil((expiresAtDate - now) / (1000 * 60 * 60));
      return hoursLeft > 0 ? hoursLeft : 1; // Minimum 1 hour
    } catch (error) {
      return 24; // Default fallback
    }
  };

  // Function to open the time adjustment dialog
  const handleOpenTimeAdjustment = (id, type, expiresIn) => {
    setLinkToAdjust({ id, type, expiresIn });
    setNewExpiryTime(expiresIn);
    setTimeAdjustmentDialogOpen(true);
  };

  // Function to update the expiration time
  const handleUpdateExpiryTime = async () => {
    if (linkToAdjust.id && linkToAdjust.type) {
      try {
        // Call API to extend the share link
        const response = await projectService.extendProjectShare(
          projectId,
          newExpiryTime,
          linkToAdjust.type === 'co_owner' ? 'co_owner' : 'reader'
        );
        
        if (response && response.data && response.data.success) {
          // Update local state
          setSharedLinks(prev => ({
            ...prev,
            [linkToAdjust.type]: prev[linkToAdjust.type].map(link => 
              link.id === linkToAdjust.id ? { ...link, expiresIn: newExpiryTime } : link
            )
          }));
          
          showNotification(`Link expiration extended to ${newExpiryTime} hours`, 'success');
        } else {
          showNotification('Failed to update expiration time', 'error');
        }
      } catch (err) {
        console.error('Error updating expiration time:', err);
        showNotification('Failed to update expiration time', 'error');
      } finally {
        setTimeAdjustmentDialogOpen(false);
        setLinkToAdjust({ id: '', type: '', expiresIn: 0 });
      }
    }
  };

  // Function to fetch reports
  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const response = await reportService.getReports(projectId);
      if (response.data && response.data.reports) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  // Effect to fetch reports when project changes
  useEffect(() => {
    if (projectId) {
      fetchReports();
    }
  }, [projectId]);

  const handleCopyReport = async () => {
    if (reportName.trim() && !isCopyingReport && reportToCopy) {
      try {
        setIsCopyingReport(true);
        const targetProjectId = selectedTargetProject || projectId;
        await reportService.copyReport(
          projectId,
          reportToCopy.id,
          reportName.trim(),
          reportDescription.trim() || undefined,
          targetProjectId !== projectId ? targetProjectId : undefined
        );
        
        // Refresh data based on where the report was copied
        if (targetProjectId === projectId) {
          await fetchReports();
        }
        
        setIsCopyReportModalOpen(false);
        setReportName('');
        setReportDescription('');
        setSelectedTargetProject('');
        setReportToCopy(null);
        showNotification('Report copied successfully', 'success');
      } catch (error) {
        console.error('Error copying report:', error);
        showNotification(error.message || 'Failed to copy report', 'error');
      } finally {
        setIsCopyingReport(false);
      }
    }
  };

  const handleCopyClick = (report) => {
    setReportToCopy(report);
    setReportName(`${report.name} (Copy)`);
    setReportDescription(report.description || '');
    setSelectedTargetProject('');
    setIsCopyReportModalOpen(true);
  };

  // Display loading spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // Display error
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  // Project not found
  if (!currentProject) {
      return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Project not found</Typography>
        </Box>
      );
    }
    
  // Render data analyst view (reports list)
  const renderDataAnalystView = () => {
    if (!currentProject) {
      return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner />
        </Box>
      );
    }
    
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with back button */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 3
        }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '1.5rem', md: '1.75rem' }
                }}
              >
                Project: {currentProject.name}
              </Typography>
            </Box>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mt: 0.5,
                fontFamily: "'Nunito Sans', sans-serif" 
              }}
            >
              {currentProject.description}
            </Typography>
          </Box>
        </Box>
        
        {currentView === 'reports' ? (
          <>
            {/* Project reports section */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
              width: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {currentView === 'reports' && (
                  <IconButton 
                    onClick={handleBackToProjects} 
                    sx={{ 
                      color: '#555555',
                      backgroundColor: 'rgba(85, 85, 85, 0.08)',
                      '&:hover': { 
                        backgroundColor: 'rgba(85, 85, 85, 0.15)',
                        color: '#FCC000'
                      },
                      borderRadius: '12px',
                      width: 40,
                      height: 40
                    }}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                  </IconButton>
                )}
                <Typography 
                  variant="h5" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 700
                  }}
                >
                  Available Reports: {reports.length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {currentView === 'reports' && (
                  <IconButton 
                    onClick={() => setCurrentView('access-management')}
                    aria-label="Edit Access Management"
                    title="Edit Access Management"
                    sx={{ 
                      color: 'white',
                      backgroundColor: '#555555',
                      '&:hover': { 
                        backgroundColor: '#333333',
                        color: '#FCC000'
                      },
                      borderRadius: '12px',
                      width: 42,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FontAwesomeIcon icon={faShareNodes} size="sm" />
                  </IconButton>
                )}
                <Button
                  variant="contained"
                  startIcon={<FontAwesomeIcon icon={faPlus} />}
                  onClick={handleAddReport}
                  sx={{ 
                    borderRadius: '12px',
                    px: 3,
                    py: 1.2,
                    height: 42,
                    bgcolor: '#555555',
                    '&:hover': { bgcolor: '#333333' },
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Add report
                </Button>
              </Box>
            </Box>
            
            {/* Reports section */}
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#333',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Reports
                </Typography>
              </Box>
              
              {reportsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <LoadingSpinner size={40} />
                </Box>
              ) : reportsError ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="error">{reportsError}</Typography>
                </Box>
              ) : reports.length === 0 ? (
                <Box 
                sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: '8px',
                    border: '1px dashed rgba(0, 0, 0, 0.12)',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <Typography color="textSecondary">No reports found for this project</Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {reports.map(report => (
                    <Grid item xs={12} sm={6} md={4} key={report.id}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2,
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                            transform: 'translateY(-2px)',
                            cursor: 'pointer'
                          }
                        }}
                        onClick={() => navigate(`/projects/${projectId}/reports/${report.id}`)}
                      >
                        {report.default_report && (
                          <Box 
                            sx={{ 
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              bgcolor: '#FCC000', 
                              color: 'white',
                              px: 1,
                              py: 0.5,
                              fontSize: '0.7rem',
                              borderRadius: '0 8px 0 8px'
                            }}
                          >
                            Default
                          </Box>
                        )}
                        
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Tooltip title={report.name} placement="top">
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontFamily: "'Inter', sans-serif",
                                  wordBreak: 'break-word',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: '200px',
                                  maxWidth: '200px'  
                                }}
                              >
                                {report.name}
                              </Typography>
                            </Tooltip>
                            <Chip
                              label={report.status || 'In Draft'}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusMenuAnchorEl(e.currentTarget);
                                setEditingReportId(report.id);
                              }}
                              sx={{
                                backgroundColor: report.status === 'Live' ? '#4caf50' : report.status === 'Deleted' ? '#f44336' : '#ff9800',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: '20px',
                                flexShrink: 0  // Prevent the chip from shrinking
                              }}
                            />
                          </Box>
                            
                          <Typography 
                            variant="body2" 
                            color="textSecondary"
                            sx={{ 
                              mb: 1,
                              minHeight: '32px',
                              fontFamily: "'Nunito Sans', sans-serif",
                              wordBreak: 'break-word'
                            }}
                          >
                            {report.description || 'No description'}
                          </Typography>
                            
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{ 
                              display: 'block', 
                              mb: 2,
                              fontSize: '0.7rem'
                            }}
                          >
                            Created: {report.created_at || 'Unknown date'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                          <Button 
                            variant="contained"
                            size="small" 
                            sx={{ 
                              flex: 1,
                              bgcolor: '#555555',
                              '&:hover': { bgcolor: '#333333' }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${projectId}/reports/${report.id}`);
                            }}
                          >
                            Open
                          </Button>
                          
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditReport(report.id);
                            }}
                            sx={{ color: '#555555' }}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} size="xs" />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyClick(report);
                            }}
                            sx={{ color: '#555555' }}
                          >
                            <FontAwesomeIcon icon={faCopy} size="xs" />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(report);
                            }}
                            sx={{ color: '#d32f2f' }}
                          >
                            <FontAwesomeIcon icon={faTrash} size="xs" />
                          </IconButton>

                          {!report.default_report && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(report.id);
                              }}
                              sx={{
                                minWidth: 'auto',
                                color: '#555555',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                p: 0.5,
                                ml: 1
                              }}
                            >
                              Set Default
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </>
        ) : (
          <>
            {/* Access Management Section */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
              width: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton 
                  onClick={() => setCurrentView('reports')} 
                  sx={{ 
                    color: '#555555',
                    backgroundColor: 'rgba(85, 85, 85, 0.08)',
                    '&:hover': { 
                      backgroundColor: 'rgba(85, 85, 85, 0.15)',
                      color: '#FCC000'
                    },
                    borderRadius: '12px',
                    width: 40,
                    height: 40
                  }}
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                </IconButton>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 700
                  }}
                >
                  Access Management
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => setIsShareModalOpen(true)}
                sx={{ 
                  borderRadius: '12px',
                  px: 3,
                  py: 1.2,
                  bgcolor: '#555555',
                  '&:hover': { bgcolor: '#333333' },
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Add share link
              </Button>
            </Box>
            
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 4,
                fontFamily: "'Nunito Sans', sans-serif" 
              }}
            >
              Manage share links and track usage for this project.
            </Typography>
            
            <Box 
              sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Paper 
                elevation={0} 
                sx={{ 
                  borderRadius: 2, 
                  overflow: 'hidden', 
                  bgcolor: 'background.paper', 
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1
                }}
              >
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                  {/* Two column layout */}
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                    {/* Co-owner Links Column */}
                    <Paper 
                      sx={{ 
                        flex: 1, 
                        p: 3, 
                        borderRadius: 3,
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        bgcolor: 'white',
                        minWidth: { xs: '100%', md: 0 }
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 2,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <FontAwesomeIcon icon={faLink} size="sm" style={{ opacity: 0.8 }} />
                        Co-owner Links
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2
                        }}
                      >
                        {sharedLinks.co_owner.length === 0 ? (
                          <Box sx={{ 
                            p: 3, 
                            borderRadius: 2,
                            border: '1px dashed rgba(0, 0, 0, 0.2)',
                            textAlign: 'center',
                          }}>
                            <Typography variant="body1" color="text.secondary">
                              No co-owner links created yet
                            </Typography>
                          </Box>
                        ) : (
                          sharedLinks.co_owner.map(link => (
                            <Box 
                              key={link.id}
                              sx={{ 
                                p: 2, 
                                borderRadius: 2,
                                border: '1px solid rgba(0, 0, 0, 0.15)',
                              }}
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                width: '100%'
                              }}>
                                <Box sx={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  flex: 1,
                                  overflow: 'hidden',
                                  mr: 0.5
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontFamily: 'monospace',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      mr: 1
                                    }}
                                  >
                                    {link.link ? (link.link.substring(0, 50) + '...') : 'No link available'}
                                  </Typography>
                                  <IconButton 
                                    size="small"
                                    onClick={() => {
                                      if (link.link) {
                                        navigator.clipboard.writeText(link.link);
                                        showNotification('Link copied to clipboard', 'success');
                                      } else {
                                        showNotification('No link available to copy', 'error');
                                      }
                                    }}
                                  >
                                    <Tooltip title="Copy link">
                                      <ContentCopyIcon fontSize="small" />
                                    </Tooltip>
                                  </IconButton>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                  <Box sx={{ 
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleOpenTimeAdjustment(link.id, 'co_owner', link.expiresIn)}
                                  >
                                    <TimerIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {link.expiresIn}h left
                                    </Typography>
                                    <IconButton 
                                      size="small"
                                      sx={{ 
                                        p: 0,
                                        color: '#555555',
                                        '&:hover': { color: '#FCC000' }
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTimeAdjustment(link.id, 'co_owner', link.expiresIn);
                                      }}
                                    >
                                      <Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>+</Typography>
                                    </IconButton>
                                  </Box>
                                  
                                  <Box sx={{ 
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}>
                                    <FontAwesomeIcon icon={faUsers} style={{ opacity: 0.7, fontSize: '14px' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {link.usersCount || 0} users
                                    </Typography>
                                  </Box>
                                  
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleRevokeLink(link.id, 'co_owner')}
                                    sx={{ 
                                      color: '#555555',
                                      '&:hover': { 
                                        backgroundColor: 'rgba(85, 85, 85, 0.08)',
                                        color: '#f44336'
                                      }
                                    }}
                                  >
                                    <Tooltip title="Revoke link">
                                      <FontAwesomeIcon icon={faTrash} size="sm" />
                                    </Tooltip>
                                  </IconButton>
                                </Box>
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                    </Paper>
                    
                    {/* Reader Links Column */}
                    <Paper 
                      sx={{ 
                        flex: 1, 
                        p: 3, 
                        borderRadius: 3,
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        bgcolor: 'white',
                        minWidth: { xs: '100%', md: 0 }
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 2,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <FontAwesomeIcon icon={faLink} size="sm" style={{ opacity: 0.8 }} />
                        Reader Links
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2
                        }}
                      >
                        {sharedLinks.reader.length === 0 ? (
                          <Box sx={{ 
                            p: 3, 
                            borderRadius: 2,
                            border: '1px dashed rgba(0, 0, 0, 0.2)',
                            textAlign: 'center',
                          }}>
                            <Typography variant="body1" color="text.secondary">
                              No reader links created yet
                            </Typography>
                          </Box>
                        ) : (
                          sharedLinks.reader.map(link => (
                            <Box 
                              key={link.id}
                              sx={{ 
                                p: 2, 
                                borderRadius: 2,
                                border: '1px solid rgba(0, 0, 0, 0.15)',
                              }}
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                width: '100%'
                              }}>
                                <Box sx={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  flex: 1,
                                  overflow: 'hidden',
                                  mr: 0.5
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontFamily: 'monospace',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      mr: 1
                                    }}
                                  >
                                    {link.link ? (link.link.substring(0, 50) + '...') : 'No link available'}
                                  </Typography>
                                  <IconButton 
                                    size="small"
                                    onClick={() => {
                                      if (link.link) {
                                        navigator.clipboard.writeText(link.link);
                                        showNotification('Link copied to clipboard', 'success');
                                      } else {
                                        showNotification('No link available to copy', 'error');
                                      }
                                    }}
                                  >
                                    <Tooltip title="Copy link">
                                      <ContentCopyIcon fontSize="small" />
                                    </Tooltip>
                                  </IconButton>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                  <Box sx={{ 
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleOpenTimeAdjustment(link.id, 'reader', link.expiresIn)}
                                  >
                                    <TimerIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {link.expiresIn}h left
                                    </Typography>
                                    <IconButton 
                                      size="small"
                                      sx={{ 
                                        p: 0,
                                        color: '#555555',
                                        '&:hover': { color: '#FCC000' }
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTimeAdjustment(link.id, 'reader', link.expiresIn);
                                      }}
                                    >
                                      <Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>+</Typography>
                                    </IconButton>
                                  </Box>
                                  
                                  <Box sx={{ 
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}>
                                    <FontAwesomeIcon icon={faUsers} style={{ opacity: 0.7, fontSize: '14px' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {link.usersCount || 0} users
                                    </Typography>
                                  </Box>
                                  
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleRevokeLink(link.id, 'reader')}
                                    sx={{ 
                                      color: '#555555',
                                      '&:hover': { 
                                        backgroundColor: 'rgba(85, 85, 85, 0.08)',
                                        color: '#f44336'
                                      }
                                    }}
                                  >
                                    <Tooltip title="Revoke link">
                                      <FontAwesomeIcon icon={faTrash} size="sm" />
                                    </Tooltip>
                                  </IconButton>
                                </Box>
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </>
        )}
        
        {/* Add Report Modal */}
        <Modal
          open={isAddReportModalOpen}
          onClose={handleCloseModal}
          title="Add New Report"
          contentSx={{ 
            width: { xs: '90%', sm: '500px' },
            maxWidth: '90vw',
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
          }}
        >
          <Box sx={{ mb: 3 }}>
              <Typography 
                component="label" 
                htmlFor="report-name" 
                sx={{ 
                display: 'block', 
                  mb: 1, 
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600
                }}
              >
              Report name
              </Typography>
              <TextField
                id="report-name"
                fullWidth
                placeholder="Enter report name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  }
                }}
              />
            </Box>
            
          <Box sx={{ mb: 3 }}>
              <Typography 
                component="label" 
                htmlFor="report-description" 
                sx={{ 
                display: 'block', 
                  mb: 1, 
                  fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600
                }}
              >
              Description (optional)
              </Typography>
              <TextField
                id="report-description"
                fullWidth
                multiline
                rows={3}
                placeholder="Enter report description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  }
                }}
              />
            </Box>
            
          <Box sx={{ mb: 4 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={setAsDefault} 
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                />
              }
              label="Set as default report"
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={handleCloseModal}
              disabled={isCreatingReport}
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
              onClick={handleCreateReport} 
              disabled={!reportName.trim() || isCreatingReport}
              sx={{ 
                borderRadius: '8px',
                bgcolor: '#555555',
                '&:hover': {
                  bgcolor: '#333333',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(0, 0, 0, 0.12)',
                }
              }}
            >
              {isCreatingReport ? 'Creating...' : 'Create report'}
            </Button>
          </Box>
        </Modal>
        
        {/* Edit Report Modal */}
        <Modal
          open={isEditReportModalOpen}
          onClose={handleCloseModal}
          title="Edit Report"
          contentSx={{ 
            width: { xs: '90%', sm: '500px' },
            maxWidth: '90vw',
            p: { xs: 3, sm: 4 },
              borderRadius: '16px',
          }}
        >
          <Box sx={{ mb: 3 }}>
              <Typography 
                component="label" 
                htmlFor="report-name" 
                sx={{ 
                display: 'block', 
                  mb: 1, 
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600
                }}
              >
              Report name
              </Typography>
              <TextField
                id="report-name"
                fullWidth
                placeholder="Enter report name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  }
                }}
              />
            </Box>
            
          <Box sx={{ mb: 3 }}>
              <Typography 
                component="label" 
                htmlFor="report-description" 
                sx={{ 
                display: 'block', 
                  mb: 1, 
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600
                }}
              >
              Description (optional)
              </Typography>
              <TextField
                id="report-description"
                fullWidth
                multiline
                rows={3}
                placeholder="Enter report description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  }
                }}
              />
            </Box>
            
          <Box sx={{ mb: 4 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={setAsDefault} 
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                />
              }
              label="Set as default report"
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCloseModal}
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
              disabled={!reportName.trim()}
              sx={{ 
                borderRadius: '8px',
                bgcolor: '#555555',
                '&:hover': {
                  bgcolor: '#333333',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(0, 0, 0, 0.12)',
                }
              }}
            >
              Save
            </Button>
          </Box>
        </Modal>
        
        {/* Share Project Modal */}
        <ShareProjectModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={projectId}
          onShareSuccess={handleShareSuccess}
        />
        
        {/* Add Delete Confirmation Modal */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Report"
          contentSx={{ 
            width: { xs: '90%', sm: '500px' },
            maxWidth: '90vw',
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ mb: 2, color: '#d32f2f', fontWeight: 600 }}>
              Warning: This action cannot be undone
            </Typography>
            <Typography>
              Are you sure you want to delete the report "{reportToDelete?.name}"? This will permanently remove the report and all its associated data.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setIsDeleteModalOpen(false)}
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
              Delete Report
            </Button>
          </Box>
        </Modal>
        
        {/* Revoke Link Confirmation Dialog */}
        <Dialog
          open={revokeDialogOpen}
          onClose={() => setRevokeDialogOpen(false)}
          aria-labelledby="revoke-dialog-title"
          aria-describedby="revoke-dialog-description"
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '12px',
              padding: 1
            }
          }}
        >
          <DialogTitle id="revoke-dialog-title" sx={{ fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif" }}>
            Revoke Link
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily: "'Nunito Sans', sans-serif", mb: 2 }}>
              Are you sure you want to revoke this share link? 
              This action cannot be undone and anyone using this link will no longer have access.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={removeUsers}
                  onChange={(e) => setRemoveUsers(e.target.checked)}
                />
              }
              label="Also remove all users who accessed with this link"
              sx={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: '0.9rem',
                mb: 1
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setRevokeDialogOpen(false)} 
              sx={{ 
                color: '#555555',
                '&:hover': { color: '#FCC000' },
                fontFamily: "'Nunito Sans', sans-serif",
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRevokeLinkConfirm} 
              variant="contained"
              sx={{ 
                bgcolor: '#f44336',
                '&:hover': { bgcolor: '#d32f2f' },
                fontFamily: "'Nunito Sans', sans-serif",
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Revoke Link
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Time Adjustment Modal */}
        <Dialog
          open={timeAdjustmentDialogOpen}
          onClose={() => setTimeAdjustmentDialogOpen(false)}
          aria-labelledby="time-adjustment-dialog-title"
          aria-describedby="time-adjustment-dialog-description"
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '12px',
              padding: 1
            }
          }}
        >
          <DialogTitle id="time-adjustment-dialog-title" sx={{ fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif" }}>
            Link expires after (hours)
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <TextField
                type="number"
                value={newExpiryTime}
                onChange={(e) => setNewExpiryTime(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                    '-webkit-appearance': 'none',
                    margin: 0
                  },
                  '& input[type=number]': {
                    '-moz-appearance': 'textfield',
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setNewExpiryTime(prev => prev + 1)}
                        sx={{ p: 0.5 }}
                      >
                        <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>+</Typography>
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => setNewExpiryTime(prev => Math.max(1, prev - 1))}
                        sx={{ p: 0.5 }}
                      >
                        <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>-</Typography>
                      </IconButton>
                    </Box>
                  )
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setTimeAdjustmentDialogOpen(false)} 
              sx={{ 
                color: '#555555',
                '&:hover': { color: '#FCC000' },
                fontFamily: "'Nunito Sans', sans-serif",
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateExpiryTime} 
              variant="contained"
              sx={{ 
                bgcolor: '#555555',
                '&:hover': { bgcolor: '#333333' },
                fontFamily: "'Nunito Sans', sans-serif",
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Menu */}
        <Menu
          anchorEl={statusMenuAnchorEl}
          open={Boolean(statusMenuAnchorEl)}
          onClose={() => {
            setStatusMenuAnchorEl(null);
            setEditingReportId(null);
          }}
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
            onClick={() => {
              handleStatusChange(editingReportId, 'Live');
              setStatusMenuAnchorEl(null);
              setEditingReportId(null);
            }}
            sx={{
              color: '#4caf50',
              fontWeight: 600
            }}
          >
            Live
          </MenuItem>
          <MenuItem 
            onClick={() => {
              handleStatusChange(editingReportId, 'In Draft');
              setStatusMenuAnchorEl(null);
              setEditingReportId(null);
            }}
            sx={{
              color: '#ff9800',
              fontWeight: 600
            }}
          >
            In Draft
          </MenuItem>
        </Menu>

        {/* Copy Report Modal */}

        <Dialog open={isCopyReportModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
          <DialogTitle>Copy Report</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Report Name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>Target Project (Optional)</InputLabel>
                <Select
                  value={selectedTargetProject}
                  onChange={(e) => setSelectedTargetProject(e.target.value)}
                  disabled={loadingProjects}
                >
                  <MenuItem value="">
                    <em>Current Project</em>
                  </MenuItem>
                  {availableProjects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button 
              onClick={handleCopyReport}
              disabled={!reportName.trim() || isCopyingReport}
              variant="contained"
            >
              {isCopyingReport ? <CircularProgress size={24} /> : 'Copy'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };
  
  // Return the appropriate view based on user role
  return (
    <RoleBasedComponent
      dataAnalystComponent={renderDataAnalystView()}
      userComponent={<UserProjectDetails project={currentProject} />}
    />
  );
};

export default ProjectDetailPage; 