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

// Help content data - easy to maintain and update
const HELP_CONTENT = {
  gettingStarted: {
    title: 'Getting Started with Claribi Console',
    icon: Question,
    iconColor: 'primary',
    defaultExpanded: true,
    description: 'Welcome to Claribi Console, your intelligent Power BI assistant! Claribi Console helps you understand and work with your Power BI data files through interactive chat and comprehensive documentation generation.',
    sections: [
      {
        title: 'Quick Start Guide',
        type: 'ordered',
        items: [
          'Upload a Power BI file: Click "Upload New" to upload your .pbix file (max 100MB)',
          'Choose your experience: Select between Interactive Chat, Documentation Generation, or Diagnostics',
          'Start exploring: Ask questions about your dataset, generate comprehensive documentation, or run diagnostics'
        ]
      }
    ]
  },
  chatFeatures: {
    title: 'Power BI Chat Features',
    icon: ChatCircle,
    iconColor: 'secondary',
    description: 'The interactive chat interface allows you to have real-time conversations with your Power BI data:',
    items: [
      'Natural Language Queries: Ask questions about your dataset in plain English',
      'Real-time Analysis: See the AI\'s thinking process as it analyzes your questions',
      'Clarification Questions: The assistant asks follow-up questions to better understand your needs',
      'Data Insights: Get specific insights about your data model, measures, relationships, and visuals'
    ]
  },
  documentationFeatures: {
    title: 'Documentation Generation Features',
    icon: FileText,
    iconColor: 'info',
    description: 'Generate comprehensive documentation for your Power BI files across five key areas:',
    items: [
      'Executive Summary: High-level overview and key insights',
      'Data Model Analysis: Detailed analysis of data structure and relationships',
      'Visualization Analysis: Review of charts, graphs, and visual elements',
      'Security Analysis: Security assessment and compliance review'
    ],
    footer: 'You can generate individual sections or complete documentation, rewrite specific sections using AI, and export it for sharing.'
  },
  faq: {
    title: 'Frequently Asked Questions',
    icon: Question,
    iconColor: 'warning',
    description: 'Find answers to common questions about Claribi Console and its features.',
    questions: [
      {
        question: 'What file types does Claribi Console support?',
        answer: 'Claribi Console supports Power BI files (.pbix) up to 100MB in size.'
      },
      {
        question: 'How does the chat interface work?',
        answer: 'Simply ask questions about your data in natural language. The AI analyzes your Power BI file and provides contextual answers about your specific dataset.'
      },
      {
        question: 'Can I edit the generated documentation?',
        answer: 'Yes! You can highlight a specific part of the generated documentation and click the "Rewrite" button to edit it using AI. You can also export the entire documentation in multiple formats for easier manual editing and sharing.'
      },
      {
        question: 'What happens to my uploaded PBIX files?',
        answer: 'Your PBIX file is processed to extract the metadata which is then stored in our secure database. The PBIX file is then deleted from our servers. Claribi Console never processes the raw data in the PBIX file. You can find more information about the data processing in the Privacy Policy and Terms of Service.'
      },
      {
        question: 'Can I apply improvement recommendations?',
        answer: 'Yes! Click on any improvement recommendation to get step-by-step guidance on how to implement it in your Power BI file.'
      },
      {
        question: 'How accurate are the AI responses?',
        answer: 'The AI provides highly accurate responses based on your specific Power BI file structure and data. It analyzes your actual data model, measures, and relationships to give contextual insights.'
      }
    ]
  },
  tips: {
    title: 'Tips for Better Results',
    icon: Lightbulb,
    iconColor: 'success',
    description: 'Get the most out of Claribi Console with these helpful tips:',
    items: [
      'Be specific in your questions: Instead of "How to create a measure?", ask "How to create a measure that calculates the total sales amount for each product?"',
      'Use the clarification feature: When the AI asks follow-up questions, provide detailed answers for better results',
      'Try different question formats: Ask about measures, relationships, data quality, or visualization recommendations',
      'Use custom instructions: When generating documentation, add specific instructions to focus on particular aspects of the data model',
      'Upload a pdf file to use as a formatting template: When generating documentation, upload a pdf file to use as a formatting template. The generated documentation will match the style, tone, language, and structure of your pdf example.'
    ]
  },
  feedback: {
    title: 'Send Feedback',
    icon: ChatText,
    iconColor: 'grey500',
    description: 'Have suggestions or found a bug? We\'d love to hear from you! Your feedback helps us improve Claribi Console.',
    buttonText: 'Leave Feedback',
    buttonIcon: ChatText,
    buttonVariant: 'outlined'
  },
  support: {
    title: 'Contact Support',
    icon: Headset,
    iconColor: 'grey500',
    description: 'Need more help? Our support team is available to assist you with any questions or issues.',
    buttonText: 'Contact Support',
    buttonIcon: Headset,
    buttonVariant: 'outlined'
  }
};

// Reusable FAQ Item Component
const FAQItem = ({ question, answer, theme }) => (
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
      {question}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
      {answer}
    </Typography>
  </Box>
);

// Reusable Help Accordion Component
const HelpAccordion = ({ 
  title, 
  Icon, 
  iconColor, 
  defaultExpanded = false, 
  children,
  theme 
}) => {
  const getIconColor = () => {
    switch (iconColor) {
      case 'primary': return theme.palette.primary.main;
      case 'secondary': return theme.palette.secondary.main;
      case 'info': return theme.palette.info.main;
      case 'warning': return theme.palette.warning.main;
      case 'success': return theme.palette.success.main;
      case 'grey600': return theme.palette.grey[600];
      case 'grey500': return theme.palette.grey[500];
      case 'grey': return theme.palette.grey[600];
      default: return theme.palette.primary.main;
    }
  };

  return (
    <Accordion 
      defaultExpanded={defaultExpanded}
      sx={{ 
        mb: 3, 
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
            bgcolor: theme.palette.background.paper,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon size={24} color={getIconColor()} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              fontFamily: "'Nunito Sans', sans-serif",
              color: theme.palette.text.primary
            }}
          >
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ 
        p: 4, 
        bgcolor: theme.palette.background.paper,
        borderRadius: '0 0 12px 12px'
      }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

// Content Renderer Components
const ListContent = ({ items, type = 'unordered', theme }) => {
  const ListComponent = type === 'ordered' ? 'ol' : 'ul';
  
  const renderItem = (item) => {
    if (typeof item === 'string') {
      // Check if item has format "Label: description"
      const match = item.match(/^(.+?):\s*(.+)$/);
      if (match) {
        return (
          <>
            <strong>{match[1]}:</strong> {match[2]}
          </>
        );
      }
      return item;
    }
    return item;
  };
  
  return (
    <Box component={ListComponent} sx={{ pl: 2, mb: 2 }}>
      {items.map((item, index) => (
        <Box key={index} component="li" sx={{ mb: 2 }}>
          <Typography variant="body1" color="text.secondary">
            {renderItem(item)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

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
        
        <Box sx={{ width: '100%', pb: 3 }}>
        {/* Getting Started Section */}
        <HelpAccordion
          title={HELP_CONTENT.gettingStarted.title}
          Icon={HELP_CONTENT.gettingStarted.icon}
          iconColor={HELP_CONTENT.gettingStarted.iconColor}
          defaultExpanded={HELP_CONTENT.gettingStarted.defaultExpanded}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.gettingStarted.description}
          </Typography>
          {HELP_CONTENT.gettingStarted.sections.map((section, index) => (
            <Box key={index}>
              <Typography variant="h6" gutterBottom sx={{ mt: index > 0 ? 3 : 3, mb: 2, color: theme.palette.primary.main }}>
                {section.title}
              </Typography>
              <ListContent items={section.items} type={section.type} theme={theme} />
            </Box>
          ))}
        </HelpAccordion>

        {/* Chat Features Section */}
        <HelpAccordion
          title={HELP_CONTENT.chatFeatures.title}
          Icon={HELP_CONTENT.chatFeatures.icon}
          iconColor={HELP_CONTENT.chatFeatures.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.chatFeatures.description}
          </Typography>
          <ListContent items={HELP_CONTENT.chatFeatures.items} theme={theme} />
        </HelpAccordion>

        {/* Documentation Features Section */}
        <HelpAccordion
          title={HELP_CONTENT.documentationFeatures.title}
          Icon={HELP_CONTENT.documentationFeatures.icon}
          iconColor={HELP_CONTENT.documentationFeatures.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.documentationFeatures.description}
          </Typography>
          <ListContent items={HELP_CONTENT.documentationFeatures.items} theme={theme} />
          {HELP_CONTENT.documentationFeatures.footer && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {HELP_CONTENT.documentationFeatures.footer}
            </Typography>
          )}
        </HelpAccordion>
        
        {/* FAQ Section */}
        <HelpAccordion
          title={HELP_CONTENT.faq.title}
          Icon={HELP_CONTENT.faq.icon}
          iconColor={HELP_CONTENT.faq.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.faq.description}
          </Typography>
          <Box sx={{ mt: 2 }}>
            {HELP_CONTENT.faq.questions.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                theme={theme}
              />
            ))}
          </Box>
        </HelpAccordion>

        {/* Tips Section */}
        <HelpAccordion
          title={HELP_CONTENT.tips.title}
          Icon={HELP_CONTENT.tips.icon}
          iconColor={HELP_CONTENT.tips.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.tips.description}
          </Typography>
          <ListContent items={HELP_CONTENT.tips.items} theme={theme} />
        </HelpAccordion>
        
        {/* Feedback Section */}
        <HelpAccordion
          title={HELP_CONTENT.feedback.title}
          Icon={HELP_CONTENT.feedback.icon}
          iconColor={HELP_CONTENT.feedback.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.feedback.description}
          </Typography>
          <Button 
            variant="outlined"
            onClick={handleOpenFeedback}
            startIcon={<HELP_CONTENT.feedback.buttonIcon size={20} />}
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
                color: theme.palette.mode === 'dark' ? '#ffffff !important' : theme.palette.primary.contrastText,
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 6px 20px rgba(0, 0, 0, 0.4)' 
                  : '0 6px 20px rgba(85, 85, 85, 0.3)',
                '& .MuiSvgIcon-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit'
                },
                '& svg': {
                  color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit'
                }
              },
              transition: 'all 0.2s ease'
            }}
          >
            {HELP_CONTENT.feedback.buttonText}
          </Button>
        </HelpAccordion>
        
        {/* Support Section */}
        <HelpAccordion
          title={HELP_CONTENT.support.title}
          Icon={HELP_CONTENT.support.icon}
          iconColor={HELP_CONTENT.support.iconColor}
          theme={theme}
        >
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP_CONTENT.support.description}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Contact{' '}
            <Link 
              href="mailto:support@claribi.ai"
              sx={{ 
                color: theme.palette.primary.main,
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              support@claribi.ai
            </Link>
          </Typography>
        </HelpAccordion>
        </Box>
      </Container>
      
      <FeedbackModal open={feedbackModalOpen} onClose={handleCloseFeedback} />
    </Box>
  );
};

export default HelpPage;