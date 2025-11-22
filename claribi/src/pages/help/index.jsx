import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Link, 
  Modal, 
  TextField, 
  Button, 
  Rating, 
  IconButton, 
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { 
  X, 
  PaperPlaneTilt, 
  CaretDown, 
  ChatCircle, 
  FileText, 
  Question, 
  Lightbulb, 
  ChatText, 
  Headset 
} from '@phosphor-icons/react';

const FeedbackModal = ({ open, onClose }) => {
  const theme = useTheme();
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
                <X size={20} />
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
                sx={{ color: theme.palette.primary.main }}
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
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                  '&:hover': {
                    color: theme.palette.action.hover,
                    borderColor: theme.palette.action.hover
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained"
                onClick={handleSubmit}
                disabled={!feedback.trim()}
                endIcon={<PaperPlaneTilt size={20} />}
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
  const theme = useTheme();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const handleOpenFeedback = () => {
    setFeedbackModalOpen(true);
  };
  
  const handleCloseFeedback = () => {
    setFeedbackModalOpen(false);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.background.chat,
      py: 4,
      width: '100%'
    }}>
      <Container maxWidth={false} sx={{ px: 3 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              mb: 2,
              fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
              fontWeight: 600,
              color: theme.palette.text.primary,
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(135deg, #FCC000 0%, #FFD700 100%)'
                : 'linear-gradient(135deg, #555555 0%, #777777 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Help Center
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              maxWidth: 700, 
              mx: 'auto',
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 400,
              lineHeight: 1.6
            }}
          >
            Your comprehensive guide to using Claribi Console
          </Typography>
        </Box>
        
        <Box sx={{ width: '100%' }}>
        <Accordion 
          defaultExpanded 
          sx={{ 
            mb: 2, 
            borderRadius: 3, 
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 8px 32px rgba(0,0,0,0.3)' 
              : '0 8px 32px rgba(0,0,0,0.08)',
            border: `1px solid ${theme.palette.divider}`,
            '&:before': { display: 'none' },
            overflow: 'hidden'
          }}
        >
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Question size={24} color={theme.palette.primary.main} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Getting Started with Claribi Console
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Welcome to Claribi Console, your intelligent Power BI assistant! Claribi Console helps you understand and work with your Power BI data files through interactive chat and comprehensive documentation generation.
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: theme.palette.primary.main }}>
              Quick Start Guide
            </Typography>
            <Box component="ol" sx={{ pl: 2, mb: 2 }}>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Upload a Power BI file:</strong> Click "Upload New" to upload your .pbix file (max 100MB)
          </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Choose your experience:</strong> Select between Interactive Chat or Documentation Generation
          </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Start exploring:</strong> Ask questions about your data or generate comprehensive documentation
          </Typography>
        </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ChatCircle size={24} color={theme.palette.secondary.main} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Power BI Chat Features
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              The interactive chat interface allows you to have real-time conversations with your Power BI data:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Natural Language Queries:</strong> Ask questions about your data in plain English
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Real-time Analysis:</strong> See the AI's thinking process as it analyzes your questions
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Clarification Questions:</strong> The assistant asks follow-up questions to better understand your needs
          </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Data Insights:</strong> Get specific insights about your data model, measures, and relationships
          </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FileText size={24} color={theme.palette.info.main} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Documentation Generation Features
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Generate comprehensive documentation for your Power BI files across five key areas:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Executive Summary:</strong> High-level overview and key insights
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Data Model Analysis:</strong> Detailed analysis of data structure and relationships
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Visualization Analysis:</strong> Review of charts, graphs, and visual elements
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Security Analysis:</strong> Security assessment and compliance review
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Improvement Recommendations:</strong> Performance and optimization suggestions
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              You can generate individual sections or complete documentation, edit the content, and export it for sharing.
            </Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Question size={24} color={theme.palette.warning.main} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Frequently Asked Questions
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Find answers to common questions about Claribi Console and its features.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  What file types does Claribi Console support?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Claribi Console supports Power BI files (.pbix) up to 100MB in size.
                </Typography>
              </Box>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  How does the chat interface work?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Simply ask questions about your data in natural language. The AI analyzes your Power BI file and provides contextual answers about your specific dataset.
                </Typography>
              </Box>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  Can I edit the generated documentation?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Yes! You can edit any section of the generated documentation directly within the application before exporting.
                </Typography>
              </Box>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  What happens to my uploaded files?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Your files are securely stored and analyzed. You can access them anytime from the home page and choose to chat with them or generate documentation.
                </Typography>
              </Box>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  Can I apply improvement recommendations?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Yes! Click on any improvement recommendation to get step-by-step guidance on how to implement it in your Power BI file.
                </Typography>
              </Box>
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: theme.palette.background.chat,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 16px rgba(0,0,0,0.4)' 
                    : '0 4px 16px rgba(0,0,0,0.05)',
                  transform: 'translateY(-1px)',
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper
                }
              }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                  mb: 1.5, 
                  color: theme.palette.primary.main,
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  How accurate are the AI responses?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  The AI provides highly accurate responses based on your specific Power BI file structure and data. It analyzes your actual data model, measures, and relationships to give contextual insights.
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Lightbulb size={24} color={theme.palette.success.main} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Tips for Better Results
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Get the most out of Claribi Console with these helpful tips:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Be specific in your questions:</strong> Instead of "What's in this file?", ask "What are the main data tables and their relationships?"
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Use the clarification feature:</strong> When the AI asks follow-up questions, provide detailed answers for better results
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Try different question formats:</strong> Ask about measures, relationships, data quality, or visualization recommendations
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <strong>Use custom instructions:</strong> When generating documentation, add specific instructions to focus on particular aspects
                </Typography>
          </Box>
        </Box>
          </AccordionDetails>
        </Accordion>
        
        <Accordion sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ChatText size={24} color={theme.palette.grey[600]} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Send Feedback
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Have suggestions or found a bug? We'd love to hear from you! Your feedback helps us improve Claribi Console.
          </Typography>
            <Button 
              variant="contained"
              onClick={handleOpenFeedback}
              startIcon={<ChatText size={20} />}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 16px rgba(85, 85, 85, 0.3)',
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 6px 20px rgba(0, 0, 0, 0.4)' 
                    : '0 6px 20px rgba(85, 85, 85, 0.4)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Leave Feedback
            </Button>
          </AccordionDetails>
        </Accordion>
        
        <Accordion sx={{ 
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: `1px solid ${theme.palette.divider}`,
          '&:before': { display: 'none' },
          overflow: 'hidden'
        }}>
          <AccordionSummary
            expandIcon={<CaretDown size={20} color={theme.palette.primary.main} />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: '12px 12px 0 0',
              px: 3,
              py: 1.5,
              minHeight: 48,
              '&:hover': { 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
              },
              '&.Mui-expanded': {
                minHeight: 48,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.action.selected,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Headset size={24} color={theme.palette.grey[500]} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: theme.palette.text.primary
                }}
              >
                Contact Support
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ 
            p: 4, 
            bgcolor: theme.palette.background.paper,
            borderRadius: '0 0 12px 12px'
          }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              Need more help? Our support team is available to assist you with any questions or issues.
          </Typography>
            <Button 
              variant="outlined"
              startIcon={<Headset size={20} />}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 6px 20px rgba(0, 0, 0, 0.4)' 
                    : '0 6px 20px rgba(85, 85, 85, 0.3)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Contact Support
            </Button>
          </AccordionDetails>
        </Accordion>
        </Box>
      </Container>
      
      <FeedbackModal open={feedbackModalOpen} onClose={handleCloseFeedback} />
    </Box>
  );
};

export default HelpPage;