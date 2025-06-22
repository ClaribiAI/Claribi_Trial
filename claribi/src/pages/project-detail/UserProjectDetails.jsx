import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  TextField,
  CircularProgress,
  Button,
  Avatar,
  Alert,
  Link,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import projectService from '../../services/projectService';
import chatbotService from '../../services/chatbotService';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFavoriteGroups, addUrlToGroup, createFavoriteGroup } from '../../store/slices/favoritesSlice';

const UserProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const { groups } = useSelector(state => state.favorites);
  
  // State for the project
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for chat
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant for this project. How can I help you?", sender: 'bot', timestamp: new Date().toISOString() },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Add state for reports and embed history
  const [reports, setReports] = useState([]);
  const [embedHistory, setEmbedHistory] = useState([]);
  const [embedIndex, setEmbedIndex] = useState(-1);
  
  // Add state for fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteAnchorEl, setFavoriteAnchorEl] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [currentUrl, setCurrentUrl] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState(null);
  
  // Fetch real project data from the backend
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await projectService.getProject(projectId);
        setProject(data);
        setError(null);
      } catch (err) {
        setError('Error loading project. Please try again.');
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);
  
  // Fetch reports for the project
  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Use the reportService to fetch all reports for this project
        const response = await import('../../services/reportService').then(m => m.default.getReports(projectId));
        if (response.data && response.data.reports) {
          setReports(response.data.reports);
        } else {
          setReports([]);
        }
      } catch (err) {
        setReports([]);
      }
    };
    fetchReports();
  }, [projectId]);
  
  useEffect(() => {
    dispatch(fetchFavoriteGroups());
  }, [dispatch]);
  
  const handleBackToProjects = () => {
    navigate('/projects');
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      // Enforce project and report status for end users
      if (!currentUser || currentUser.role !== ROLES.DATA_ANALYST) {
        // Only allow if project is Live
        if (!project || project.status !== 'Live') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: 'You can only chat with projects that are Live.',
            sender: 'bot',
            timestamp: new Date().toISOString()
          }]);
          setInputMessage('');
          return;
        }
        // Only allow if there is at least one Live report
        const liveReports = reports.filter(r => r.status === 'Live');
        if (liveReports.length === 0) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: 'There are no Live reports available for this project.',
            sender: 'bot',
            timestamp: new Date().toISOString()
          }]);
          setInputMessage('');
          return;
        }
      }
      // Add user message
      const userMessage = {
        id: Date.now(),
        text: inputMessage,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsTyping(true);
      try {
        // Send query to the backend
        const response = await chatbotService.sendQuery(projectId, null, inputMessage.trim());
        let botMessage;
        if (response.data.success) {
          // Create bot message with the response from the backend
          const url = response.data.url;
          const filters = response.data.filters;
          const messageText = response.data.message || response.data.response || 'I processed your request but have no specific response.';
          
          // Process filters if they exist
          let processedFilters = filters;
          if (typeof filters === 'string') {
            // If filters is a string, create an object with a single filter
            processedFilters = { filter: filters };
          } else if (Array.isArray(filters)) {
            // If filters is an array, join it into a single string
            processedFilters = { filter: filters.join('') };
          }
          
          botMessage = {
            id: Date.now(),
            text: messageText,
            sender: 'bot',
            timestamp: new Date().toISOString(),
            url,
            filters: processedFilters
          };
          
          // Store embed URL if present, and update history
          if (url && url.startsWith('https://app.powerbi.com/reportEmbed?')) {
            setEmbedHistory(prev => {
              const newHistory = prev.slice(0, embedIndex + 1); // Discard forward history if any
              newHistory.push({ 
                url, 
                message: botMessage.text,
                timestamp: botMessage.timestamp,
                filters: processedFilters 
              });
              return newHistory;
            });
            setEmbedIndex(prev => prev + 1);
          }
        } else {
          // Create error message if the request failed
          botMessage = {
            id: Date.now(),
            text: `Sorry, I encountered an issue: ${response.data.error || 'Unknown error'}`,
            sender: 'bot',
            timestamp: new Date().toISOString()
          };
        }
        setMessages(prev => [...prev, botMessage]);
      } catch (err) {
        // Handle network or unexpected errors
        const errorMessage = {
          id: Date.now(),
          text: 'Sorry, I encountered a technical issue. Please try again later.',
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        console.error('Error sending message to chatbot:', err);
      } finally {
        setIsTyping(false);
      }
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleBackEmbed = () => {
    if (embedIndex > 0) {
      setEmbedIndex(prev => prev - 1);
    }
  };

  const handleForwardEmbed = () => {
    if (embedIndex < embedHistory.length - 1) {
      setEmbedIndex(prev => prev + 1);
    }
  };
  
  // Helper to get reports for chatbot based on role
  const getChatbotReports = () => {
    if (!reports) return [];
    if (currentUser && currentUser.role === ROLES.DATA_ANALYST) {
      // Data analyst: show both Live and In Draft
      return reports.filter(r => r.status === 'Live' || r.status === 'In Draft');
    }
    // End user: only Live
    return reports.filter(r => r.status === 'Live');
  };
  
  const extractReportInfo = (message) => {
    try {
      // Extract report name and page name from the chatbot response message
      const match = message.match(/in the '(.+?)' report, '(.+?)' page/);
      if (match) {
        const [, reportName, pageName] = match;
        return `${reportName} - ${pageName}`;
      }
      return 'Unknown Report and Page';
    } catch (error) {
      return 'Unknown Report and Page';
    }
  };

  const handleFavoriteClick = (url, event) => {
    event.stopPropagation();
    const title = extractReportInfo(currentEmbed.message);
    setCurrentUrl({
      ...url,
      title
    });
    setFavoriteAnchorEl(event.currentTarget);
  };

  const handleFavoriteClose = () => {
    setFavoriteAnchorEl(null);
  };

  const handleCreateGroup = async () => {
    if (newGroupName.trim()) {
      try {
        const result = await dispatch(createFavoriteGroup(newGroupName.trim()));
        
        // Check if the action was rejected
        if (result.type === 'favorites/createGroup/rejected') {
          setSnackbarMessage({
            type: 'error',
            message: result.payload || 'A group with this name already exists'
          });
          return;
        }
        
        // Add URL to the newly created group
        const addResult = await dispatch(addUrlToGroup({
          groupId: result.payload.id,
          url: currentUrl.url,
          title: currentUrl.title || 'Saved URL',
          filters: currentUrl.filters
        }));
        
        if (addResult.type === 'favorites/addUrl/rejected') {
          setSnackbarMessage({
            type: 'info',
            message: addResult.payload || 'This URL is already saved in this favorites group'
          });
        } else {
          setSnackbarMessage({
            type: 'success',
            message: 'URL saved successfully'
          });
        }
        setNewGroupName('');
        setIsCreateGroupModalOpen(false);
        handleFavoriteClose();
      } catch (error) {
        setSnackbarMessage({
          type: 'error',
          message: error.message || 'Failed to create group'
        });
      }
    }
  };

  const handleAddToGroup = async (groupId) => {
    try {
      const result = await dispatch(addUrlToGroup({
        groupId,
        url: currentUrl.url,
        title: currentUrl.title || 'Saved URL',
        filters: currentUrl.filters
      }));

      if (result.error) {
        setSnackbarMessage({
          type: 'info',
          message: result.payload || 'This URL is already saved in this favorites group'
        });
      } else {
        setSnackbarMessage({
          type: 'success',
          message: 'URL saved successfully'
        });
      }
      handleFavoriteClose();
    } catch (error) {
      setSnackbarMessage({
        type: 'error',
        message: error.message || 'Failed to add URL to the group'
      });
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={handleBackToProjects}>
          Back to Projects
        </Button>
      </Box>
    );
  }
  
  if (!project) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Typography>Project not found</Typography>
      </Box>
    );
  }

  const currentEmbed = embedIndex >= 0 ? embedHistory[embedIndex] : null;
  
  return (
    <>
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        bgcolor: '#fff'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)', 
          display: 'flex', 
          alignItems: 'center',
          minHeight: '64px'
        }}>
          <IconButton onClick={handleBackToProjects} sx={{ mr: 2 }}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif" }}>
            {project.name}
          </Typography>
        </Box>

        {/* Main content */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          minHeight: 0 // This is important for proper flex behavior
        }}>
          {/* Split view for chat and embed */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden',
            minHeight: 0 // This is important for proper flex behavior
          }}>
            {/* Messages area - adjusted width */}
            <Box sx={{ 
              width: currentEmbed ? '30%' : '100%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRight: currentEmbed ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
              minHeight: 0 // This is important for proper flex behavior
            }}>
              <Box sx={{ 
                flex: 1, 
                p: 2, 
                overflow: 'auto', 
                bgcolor: 'rgba(0, 0, 0, 0.01)', 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0 // This is important for proper flex behavior
              }}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', maxWidth: '70%' }}>
                      {message.sender === 'bot' && (
                        <Avatar
                          sx={{
                            bgcolor: '#6a1b9a',
                            width: 32,
                            height: 32,
                            mr: 1,
                            mt: 0.5
                          }}
                        >
                          AI
                        </Avatar>
                      )}
                      <Paper
                        sx={{
                          p: 2,
                          bgcolor: message.sender === 'user' ? '#6a1b9a' : '#fff',
                          color: message.sender === 'user' ? '#fff' : 'inherit',
                          borderRadius: 2,
                          maxWidth: '100%',
                          boxShadow: 'none',
                          border: message.sender === 'user' ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
                        }}
                      >
                        <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {message.text}
                        </Typography>
                        {message.url && (
                          <Link
                            href={message.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mt: 1,
                              color: message.sender === 'user' ? '#fff' : '#6a1b9a',
                            }}
                          >
                            View Report <OpenInNewIcon sx={{ ml: 0.5, fontSize: 16 }} />
                          </Link>
                        )}
                        {message.filters && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                            <Typography variant="caption" color="text.secondary">
                              Applied Filters:
                            </Typography>
                            <Typography variant="body2">
                              {Object.entries(message.filters)
                                .map(([key, value]) => 
                                  key === 'filter' ? value : `${key}: ${value}`
                                )
                                .join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                      {message.sender === 'user' && (
                        <Avatar
                          sx={{
                            bgcolor: '#555555',
                            width: 32,
                            height: 32,
                            ml: 1,
                            mt: 0.5
                          }}
                        >
                          U
                        </Avatar>
                      )}
                    </Box>
                  </Box>
                ))}
                
                {isTyping && (
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 6, mb: 2 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Assistant is typing...
                    </Typography>
                  </Box>
                )}
                
                <div ref={messagesEndRef} />
              </Box>
            </Box>

            {/* Embed area */}
            {currentEmbed && (
              <Box sx={{ 
                flex: isFullscreen ? 1 : 'initial',
                width: isFullscreen ? '100%' : '70%',
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                position: isFullscreen ? 'fixed' : 'relative',
                top: isFullscreen ? 0 : 'auto',
                left: isFullscreen ? 0 : 'auto',
                right: isFullscreen ? 0 : 'auto',
                bottom: isFullscreen ? 0 : 'auto',
                zIndex: isFullscreen ? 1300 : 'auto',
                bgcolor: '#fff'
              }}>
                {/* Report header with fullscreen button */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  p: 1,
                  gap: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  bgcolor: 'white'
                }}>
                  <IconButton
                    onClick={(e) => handleFavoriteClick({
                      url: currentEmbed.url,
                      filters: currentEmbed.filters
                    }, e)}
                    sx={{ 
                      color: isFavorite ? '#e91e63' : 'rgba(0, 0, 0, 0.54)',
                      '&:hover': {
                        color: isFavorite ? '#c2185b' : '#e91e63'
                      }
                    }}
                  >
                    {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <IconButton
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    sx={{ color: '#6a1b9a' }}
                  >
                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Box>
                
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <iframe
                    title="Power BI Report"
                    src={currentEmbed.url}
                    frameBorder="0"
                    allowFullScreen
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </Box>
                {/* Filters info */}
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(0, 0, 0, 0.02)', 
                  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                    Current Filters: {currentEmbed.filters ? 
                      Object.entries(currentEmbed.filters)
                        .map(([key, value]) => key === 'filter' ? value : `${key}: ${value}`)
                        .join(', ')
                      : 'None'
                  }
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Navigation buttons for embed history */}
          {embedHistory.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2, 
              p: 1, 
              borderTop: '1px solid rgba(0, 0, 0, 0.12)',
              minHeight: '48px'
            }}>
              <IconButton
                onClick={handleBackEmbed}
                disabled={embedIndex <= 0}
                sx={{ color: '#6a1b9a' }}
              >
                <ArrowBackRoundedIcon />
              </IconButton>
              <IconButton
                onClick={handleForwardEmbed}
                disabled={embedIndex >= embedHistory.length - 1}
                sx={{ color: '#6a1b9a' }}
              >
                <ArrowForwardRoundedIcon />
              </IconButton>
            </Box>
          )}

          {/* Input area */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid rgba(0, 0, 0, 0.12)',
            minHeight: '80px'
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                multiline
                maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    p: 1,
                    pl: 2,
                    fontFamily: '"Nunito Sans", sans-serif',
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                sx={{
                  borderRadius: '50%',
                  minWidth: 0,
                  width: 48,
                  height: 48,
                  p: 0,
                  bgcolor: '#6a1b9a',
                  '&:hover': {
                    bgcolor: '#8e24aa'
                  }
                }}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Favorites Menu */}
        <Menu
          anchorEl={favoriteAnchorEl}
          open={Boolean(favoriteAnchorEl)}
          onClose={handleFavoriteClose}
        >
          <MenuItem onClick={() => setIsCreateGroupModalOpen(true)}>
            <ListItemIcon>
              <CreateNewFolderIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Create New Group" />
          </MenuItem>
          {groups.length > 0 && <Divider />}
          {groups.map((group) => (
            <MenuItem key={group.id} onClick={() => handleAddToGroup(group.id)}>
              <ListItemIcon>
                <FolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={group.name} />
            </MenuItem>
          ))}
        </Menu>

        {/* Create Group Modal */}
        <Dialog open={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)}>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateGroupModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} variant="contained" color="primary">
              Create & Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert 
          onClose={() => setSnackbarMessage(null)} 
          severity={snackbarMessage?.type} 
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {snackbarMessage?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UserProjectDetails; 