import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Link, Modal, TextField, Button, Rating, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

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
          <Box sx={{ textAlign: 'center' }}>
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

const HelpPage = () => {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const handleOpenFeedback = () => {
    setFeedbackModalOpen(true);
  };
  
  const handleCloseFeedback = () => {
    setFeedbackModalOpen(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4 }}>
        Help Center
      </Typography>
      
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Welcome to our help center! This page provides resources to help you get started with our platform.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This is a placeholder for the help center. In a real application, you would find tutorials, FAQs, and guides here.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Find answers to common questions about our platform and features.
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                How do I create a new project?
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Can I share my projects with team members?
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                How do I export my project data?
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Send Feedback
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Have suggestions or found a bug? We'd love to hear from you!
          </Typography>
          <Button 
            variant="contained"
            onClick={handleOpenFeedback}
            sx={{ 
              borderRadius: '24px',
              px: 3,
              py: 1.5,
              bgcolor: '#555555',
              '&:hover': {
                bgcolor: '#333333'
              }
            }}
          >
            Leave Feedback
          </Button>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Contact Support
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Need more help? Our support team is available to assist you.
          </Typography>
          <Link href="#" underline="hover" color="primary">
            <Typography variant="body2">Contact Support</Typography>
          </Link>
        </Box>
      </Paper>
      
      <FeedbackModal open={feedbackModalOpen} onClose={handleCloseFeedback} />
    </Container>
  );
};

export default HelpPage;