import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme, Modal, Paper, Typography, TextField, Button, Rating, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import Sidebar from './Sidebar';
import Header from './Header';

const FeedbackModal = ({ open, onClose }) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = () => {
    // In a real app, you would send the feedback to a server
    console.log('Feedback submitted:', { rating, feedback });
    setSubmitted(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setSubmitted(false);
      setRating(5);
      setFeedback('');
      onClose();
    }, 2000);
  };
  
  return (
    <Modal
      open={open}
      onClose={submitted ? null : onClose}
      aria-labelledby="feedback-modal-title"
    >
      <Paper sx={{ 
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: 500,
        p: 4,
        outline: 'none',
        borderRadius: 2,
        boxShadow: 24,
      }}>
        {!submitted ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" id="feedback-modal-title" sx={{ fontWeight: 'bold' }}>
                Leave Feedback
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 3 }}>
              Your feedback helps us improve. Let us know how we're doing!
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Rating
              </Typography>
              <Rating
                value={rating}
                onChange={(event, newValue) => {
                  setRating(newValue);
                }}
                size="large"
                sx={{ color: '#555555' }}
              />
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Your Feedback
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think..."
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  }
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={onClose}
                sx={{ 
                  borderRadius: '24px',
                  px: 3,
                  color: '#555555',
                  borderColor: '#555555',
                  '&:hover': {
                    color: '#FCC000',
                    borderColor: '#FCC000'
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained"
                onClick={handleSubmit}
                disabled={!feedback.trim()}
                endIcon={<SendIcon />}
                sx={{ 
                  borderRadius: '24px',
                  px: 3,
                  bgcolor: '#555555',
                  '&:hover': {
                    bgcolor: '#333333'
                  },
                  '&:hover .MuiSvgIcon-root': {
                    color: '#FCC000'
                  }
                }}
              >
                Submit Feedback
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#555555' }}>
              Thank You!
            </Typography>
            <Typography variant="body1">
              Your feedback has been submitted successfully.
            </Typography>
          </Box>
        )}
      </Paper>
    </Modal>
  );
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleOpenFeedback = () => {
    setFeedbackModalOpen(true);
  };
  
  const handleCloseFeedback = () => {
    setFeedbackModalOpen(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      overflow: 'hidden', 
      position: 'relative',
      bgcolor: '#EEEEEE'
    }}>
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} onOpenFeedback={handleOpenFeedback} />
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          padding: { xs: 1, sm: 3 },
          position: 'relative',
          zIndex: 1
        }}
      >
        <Header toggleSidebar={toggleSidebar} />
        <Box 
          sx={{ 
            flexGrow: 1,
            overflow: 'auto',
            width: '100%',
            maxWidth: '100%',
            mt: 2,
            background: '#fff',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            p: { xs: 2, sm: 3, md: 4 },
            overflow: 'auto'
          }}>
            {children}
          </Box>
        </Box>
      </Box>
      
      {/* Feedback Modal */}
      <FeedbackModal open={feedbackModalOpen} onClose={handleCloseFeedback} />
    </Box>
  );
};

export default Layout;