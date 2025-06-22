import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl,
  InputLabel,
  Button,
  IconButton
} from '@mui/material';
import Modal from '../ui/Modal';
import { useProjects } from '../../contexts/ProjectContext';
import { useNotification } from '../../contexts/NotificationContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const ShareProjectModal = ({ open, onClose, projectId, onShareSuccess }) => {
  const { showNotification } = useNotification();
  const { shareProject } = useProjects();
  const [expirationHours, setExpirationHours] = useState(24);
  const [accessType, setAccessType] = useState('co_owner');
  const [loading, setLoading] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handleShare = async () => {
    try {
      setLoading(true);
      
      const result = await shareProject(projectId, accessType, expirationHours);
      
      if (result && result.success) {
        const url = result.share_url;
        
        if (url) {
          setShareUrl(url);
          setShowShareLink(true);
          showNotification('Project shared successfully!', 'success');
          
          if (onShareSuccess) {
            onShareSuccess({
              url,
              accessType,
              expirationHours
            });
          }
        } else {
          throw new Error('No share URL returned from server');
        }
      } else {
        throw new Error(result?.error || 'Failed to share project');
      }
    } catch (err) {
      showNotification(`Failed to share project: ${err.message || 'Please try again.'}`, 'error');
      console.error('Error sharing project:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showNotification('Share link copied to clipboard!', 'success');
        setTimeout(() => onClose(), 1000);
      })
      .catch(() => {
        showNotification('Failed to copy link', 'error');
      });
  };
  
  const handleClose = () => {
    setShareUrl('');
    setExpirationHours(24);
    setAccessType('co_owner');
    setShowShareLink(false);
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose}
      title="Create Share Link"
      actions={
        !showShareLink ? (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              onClick={handleClose}
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleShare}
              disabled={loading}
              sx={{ 
                bgcolor: '#555555',
                '&:hover': { bgcolor: '#333333' },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Share
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyUrl}
              sx={{ 
                bgcolor: '#555555',
                '&:hover': { bgcolor: '#333333' },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                px: 3,
                py: 1,
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
              Copy Link
            </Button>
          </Box>
        )
      }
      contentSx={{ 
        width: { xs: '90%', sm: '450px' },
        maxWidth: '90vw',
        p: { xs: 3, sm: 4 },
        borderRadius: '16px',
      }}
    >
      {!showShareLink ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Create a new share link
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Link expires after (hours)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  type="number"
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(Math.max(1, parseInt(e.target.value) || 1))}
                  sx={{
                    width: '100%',
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
                          onClick={() => setExpirationHours(prev => prev + 24)}
                          sx={{ p: 0.5 }}
                        >
                          <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>+</Typography>
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => setExpirationHours(prev => Math.max(1, prev - 24))}
                          sx={{ p: 0.5 }}
                        >
                          <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>-</Typography>
                        </IconButton>
                      </Box>
                    )
                  }}
                />
              </Box>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Access type
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                  sx={{
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.23)'
                    }
                  }}
                >
                  <MenuItem value="co_owner">Co-owner (Can edit)</MenuItem>
                  <MenuItem value="reader">Reader (View only)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Share this project with your team members
          </Typography>
          
          <Paper sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.04)'
          }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, mr: 2 }}>
              {shareUrl}
            </Typography>
            <IconButton 
              onClick={handleCopyUrl}
            >
              <ContentCopyIcon />
            </IconButton>
          </Paper>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ 
              bgcolor: '#e0e0e0',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Expires in {expirationHours} hours
              </Typography>
            </Box>
            
            <Box sx={{ 
              bgcolor: accessType === 'co_owner' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 500, 
                  color: accessType === 'co_owner' ? '#4caf50' : '#2196f3' 
                }}
              >
                {accessType === 'co_owner' ? 'Co-owner (Can edit)' : 'Reader (View only)'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Modal>
  );
};

export default ShareProjectModal; 