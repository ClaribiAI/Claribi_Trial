import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Avatar,
  Link,
  IconButton,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useQueryAssistant } from './hooks/useQueryAssistant';

const QueryAssistant = ({ projectId, reportId }) => {
  const {
    loading,
    messages,
    inputMessage,
    isTyping,
    hasData,
    embedHistory,
    embedIndex,
    currentEmbed,
    messagesEndRef,
    setInputMessage,
    handleSendMessage,
    handleKeyPress,
    handleBackEmbed,
    handleForwardEmbed,
  } = useQueryAssistant(projectId, reportId);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: '#6a1b9a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography 
        variant="h6" 
        sx={{ mb: 3, fontWeight: 'normal', fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif" }}
      >
        Query Assistant
      </Typography>

      {hasData && (
        <>
        

          {currentEmbed ? (
            <>
              <Box sx={{ mt: 2, mb: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                  {embedIndex > 0 && (
                    <IconButton onClick={handleBackEmbed} sx={{ mr: 2 }}>
                      <ArrowBackRoundedIcon />
                    </IconButton>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <iframe
                      title="Power BI Report"
                      src={currentEmbed.url}
                      width="100%"
                      height="600"
                      style={{ border: 0, borderRadius: 8, minHeight: 400 }}
                      allowFullScreen
                    />
                  </Box>
                  {embedIndex < embedHistory.length - 1 && (
                    <IconButton onClick={handleForwardEmbed} sx={{ ml: 2 }}>
                      <ArrowForwardRoundedIcon />
                    </IconButton>
                  )}
                </Box>
                {/* Display filters below the embed */}
                {currentEmbed.filters && (
                  <Box sx={{ 
                    width: '100%', 
                    mt: 2, 
                    display: 'flex', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '8px',
                    p: 2
                  }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary', 
                        fontFamily: "'Nunito Sans', sans-serif", 
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}
                    >
                      Applied filters: {currentEmbed.filters}
                    </Typography>
                  </Box>
                )}
              </Box>
              {/* Always show the chat input box below the embed */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
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
                      pl: 2
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
                  <SendRoundedIcon />
                </Button>
              </Box>
            </>
          ) : (
            <>
              {/* Chat messages */}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 2,
                  mb: 2,
                  overflow: 'auto',
                  minHeight: 400
                }}
              >
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        maxWidth: '70%'
                      }}
                    >
                      {message.sender === 'bot' && (
                        <Avatar
                          sx={{
                            bgcolor: '#2196f3',
                            width: 32,
                            height: 32,
                            mr: 1,
                            mt: 0.5
                          }}
                        >
                          B
                        </Avatar>
                      )}
                      <Box>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            bgcolor: message.sender === 'user' ? '#6a1b9a' : 'white',
                            color: message.sender === 'user' ? 'white' : 'inherit',
                            borderRadius: 2,
                            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <Typography variant="body1">{message.text}</Typography>
                          {message.url && (
                            <Link 
                              href={message.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              sx={{
                                display: 'block',
                                mt: 1,
                                color: '#2196f3',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              View Report <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                            </Link>
                          )}
                          {message.sender === 'bot' && message.filters && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                mt: 1,
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                fontFamily: "'Nunito Sans', sans-serif",
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                wordBreak: 'break-word'
                              }}
                            >
                              Filters applied: {message.filters}
                            </Typography>
                          )}
                        </Paper>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            mt: 0.5,
                            display: 'block',
                            textAlign: message.sender === 'user' ? 'right' : 'left'
                          }}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
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
                      Bot is typing...
                    </Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Paper>
              {/* Message input */}
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
                  <SendRoundedIcon />
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

QueryAssistant.propTypes = {
  projectId: PropTypes.string.isRequired,
  reportId: PropTypes.string.isRequired,
};

export default QueryAssistant; 