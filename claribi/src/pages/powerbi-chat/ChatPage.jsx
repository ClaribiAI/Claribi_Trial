import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Tooltip,
    Chip
} from '@mui/material';
import {
    PaperPlaneRight,
    ArrowLeft,
    Copy,
    X as XIcon
} from '@phosphor-icons/react';
import { sendPowerBIQueryWithUpdates, deletePowerBISession, sendUserClarifications } from '../../services/powerbiChatService';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';
import ThinkingProcess from '../../components/ui/ThinkingProcess';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';

const ChatPage = ({ pbixFile, onBack, isNewlyUploaded, initialMessage, onCloseChat, isInline = false }) => {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [thinkingProcess, setThinkingProcess] = useState({
        isVisible: false,
        currentAction: '',
        followUpQueries: [],
        isCompleted: false
    });
    const [actionHistory, setActionHistory] = useState([]);
    const [lastRegularActionId, setLastRegularActionId] = useState(null);
    
    // Inline clarification state
    const [clarificationFlow, setClarificationFlow] = useState({
        active: false,
        questions: [],
        answers: {},
        originalQuery: '',
        currentIndex: 0,
        clarificationSessionKey: null
    });
    const [currentClarificationAnswer, setCurrentClarificationAnswer] = useState('');
    const [isProcessingClarifications, setIsProcessingClarifications] = useState(false);
    const [isWaitingForClarifications, setIsWaitingForClarifications] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyButtonHovered, setCopyButtonHovered] = useState(false);
    
    // Conversation history state for follow-up questions
    const [conversationHistory, setConversationHistory] = useState([]);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const MAX_CONVERSATION_TOKENS = 8000; // Token limit for conversation history

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const clarificationDialogOpenRef = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Token estimation utility (rough: ~4 chars per token)
    const estimateTokens = (text) => {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    };

    // Summarize conversation history when it exceeds token limit
    const summarizeConversationHistory = (history) => {
        if (history.length <= 2) return history; // Keep at least 2 exchanges
        
        let totalTokens = 0;
        let keepFromIndex = 0;
        
        // Calculate tokens from the end backwards
        for (let i = history.length - 1; i >= 0; i--) {
            const messageTokens = estimateTokens(history[i].content);
            if (totalTokens + messageTokens > MAX_CONVERSATION_TOKENS) {
                keepFromIndex = i + 1;
                break;
            }
            totalTokens += messageTokens;
        }
        
        if (keepFromIndex === 0) return history; // No summarization needed
        
        // Keep recent messages and summarize older ones
        const recentMessages = history.slice(keepFromIndex);
        const olderMessages = history.slice(0, keepFromIndex);
        
        // Create a summary of older messages
        const summary = {
            role: 'system',
            content: `[Previous conversation summary: ${olderMessages.length} exchanges about Power BI topics]`,
            timestamp: new Date()
        };
        
        return [summary, ...recentMessages];
    };

    // Function to add action to history
    const addActionToHistory = (action, step, status, searchQuery = null, type = 'regular', searchId = null, searchSummary = null) => {
        // Validate action text - don't add empty or invalid actions
        if (!action || action.trim() === '' || action.trim() === 'Search:') {
            console.warn('Skipping empty or invalid action:', action);
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const newAction = {
            id: searchId || Date.now() + Math.random(), // Use searchId if provided, otherwise generate unique ID
            action: action.trim(), // Ensure action is trimmed
            timestamp,
            step,
            status,
            searchQuery,
            searchSummary, // Store the user-friendly summary
            type,
            searchId
        };
        console.log('Adding action to history:', newAction);
        setActionHistory(prev => {
            const updated = [...prev, newAction];
            console.log('Updated action history:', updated);
            return updated;
        });
    };

    // Track the previous message count to only scroll when new messages are added
    const prevMessageCountRef = useRef(0);
    
    useEffect(() => {
        // Only scroll to bottom when new messages are actually added
        if (messages.length > prevMessageCountRef.current && messages.length > 0) {
            scrollToBottom();
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    // Add system message when file is selected (only for newly uploaded files and not inline)
    useEffect(() => {
        if (pbixFile && messages.length === 0 && !isInline) {
            if (isNewlyUploaded) {
                const metadata = pbixFile.metadata || {};
                const systemMessage = {
                    id: Date.now(),
                    type: 'assistant',
                    content: `Great! I've analyzed your Power BI file "${pbixFile.name}". I found ${metadata.tables_count || 0} tables, ${metadata.measures_count || 0} measures, ${metadata.visuals_count || 0} visuals, ${metadata.relationships_count || 0} relationships, and ${metadata.power_query_scripts_count || 0} Power Query scripts. I can now provide specific insights about your data model and help with any questions about your dataset.`,
                    timestamp: new Date(),
                    messageType: 'system_welcome'
                };
                setMessages([systemMessage]);
            } else {
                const metadata = pbixFile.metadata || {};
                const systemMessage = {
                    id: Date.now(),
                    type: 'assistant',
                    content: `Great! I've loaded your previously uploaded Power BI file "${pbixFile.name}". I found ${metadata.tables_count || 0} tables, ${metadata.measures_count || 0} measures, ${metadata.visuals_count || 0} visuals, ${metadata.relationships_count || 0} relationships, and ${metadata.power_query_scripts_count || 0} Power Query scripts. I can now provide specific insights about your data model and help with any questions about your dataset.`,
                    timestamp: new Date(),
                    messageType: 'system_welcome'
                };
                setMessages([systemMessage]);
            }
        }
    }, [pbixFile, isNewlyUploaded, isInline]);

    // Cleanup: Delete session when component unmounts
    // Note: We don't delete sessions when unmounting to prevent accidental deletion
    // when switching between views. Sessions should only be deleted explicitly by user action.
    useEffect(() => {
        return () => {
            // Removed automatic deletion on unmount to prevent data loss
            // Sessions will be cleaned up by explicit user actions or server-side cleanup
        };
    }, []); // Empty dependency array - only run on unmount

    // Handle Enter key for clarification answers
    const handleClarificationKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            submitCurrentClarificationAnswer();
        }
    };

    // Clean text for copying - remove markdown formatting, code blocks, etc.
    const cleanTextForCopy = (text) => {
        if (!text) return '';
        
        return text
            // Remove code blocks (```dax ... ```)
            .replace(/```[\s\S]*?```/g, '')
            // Remove inline code (`code`)
            .replace(/`([^`]+)`/g, '$1')
            // Remove bold/italic markdown
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            // Remove headers
            .replace(/^#{1,6}\s+/gm, '')
            // Remove links [text](url) -> text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}$/gm, '')
            // Remove list markers
            .replace(/^[\s]*[-*+]\s+/gm, '• ')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove blockquotes
            .replace(/^>\s*/gm, '')
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Trim whitespace
            .trim();
    };

    // Copy text to clipboard
    const handleCopyText = async (text) => {
        const cleanText = cleanTextForCopy(text);
        try {
            await navigator.clipboard.writeText(cleanText);
            setCopySuccess(true);
            setCopyButtonHovered(false); // Reset hover state
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = cleanText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setCopyButtonHovered(false); // Reset hover state
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const handleSendMessage = useCallback(async (messageToSend = null) => {
        const message = messageToSend || inputMessage;
        if (!message?.trim() || isLoading) return;
        
        // Check if PBIX file is uploaded
        if (!pbixFile) {
            setError('Please upload a Power BI file first before asking questions.');
            return;
        }
    
        const userMessage = { 
            id: Date.now(), 
            type: 'user', 
            content: message.trim(), 
            timestamp: new Date(),
            messageType: 'user_query'
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Add user message to conversation history
        const newConversationHistory = [...conversationHistory, {
            role: 'user',
            content: message.trim(),
            timestamp: new Date()
        }];
        
        // Summarize conversation history if needed
        const summarizedHistory = summarizeConversationHistory(newConversationHistory);
        setConversationHistory(summarizedHistory);
        
        console.log('Conversation history being sent:', summarizedHistory);
        
        const originalQuery = message.trim();
        // Only clear input message if we're not using a passed message
        if (!messageToSend) {
            setInputMessage('');
        }
        setIsLoading(true);
        setError(null);
        setActionHistory([]); // Clear previous history
        setLastRegularActionId(null); // Reset regular action tracking
        setThinkingProcess({
            isVisible: true,
            currentAction: 'Starting analysis...',
            followUpQueries: [],
            isCompleted: false,
        });
    
        try {
            const handleRealTimeUpdate = (updateData) => {
                console.log('Real-time update received:', updateData);
                
                // Handle search step updates
                if (updateData.step === 'search_generated') {
                    console.log('Processing search_generated update:', updateData);
                    // Add search step to action history - use search_summary for display, store search_query for reference
                    const searchSummary = updateData.search_summary || updateData.search_query || 'Unknown search';
                    const searchQuery = updateData.search_query || 'Unknown query';
                    // Capitalize first letter of summary
                    const capitalizedSummary = searchSummary.charAt(0).toUpperCase() + searchSummary.slice(1);
                    addActionToHistory(capitalizedSummary, 0, 'in_progress', searchQuery, 'search', updateData.search_id, capitalizedSummary);
                } else if (updateData.step === 'search_completed') {
                    console.log('Processing search_completed update:', updateData);
                    // Update existing search step to completed status
                    setActionHistory(prev => prev.map(action => 
                        action.searchId === updateData.search_id 
                            ? { 
                                ...action, 
                                status: 'completed', 
                                action: action.searchSummary || action.searchQuery || 'Unknown search',
                                resultCount: updateData.result_count
                            }
                            : action
                    ));
                } else {
                    console.log('Processing regular update:', updateData);
                    // Handle regular updates
                    setThinkingProcess(prev => ({
                        ...prev,
                        currentAction: updateData.message,
                        // Add any follow-up queries sent in the update for context, but don't add to history here
                        followUpQueries: updateData.follow_up_queries ? 
                            [...new Set([...prev.followUpQueries, ...updateData.follow_up_queries])] : 
                            prev.followUpQueries,
                    }));
        
                    // ✅ CORRECT: Only add the main message for this step to the history timeline.
                    // The individual searches are handled by their own 'search_generated' step.
                    
                    // Mark previous regular action as completed if it exists
                    if (lastRegularActionId) {
                        setActionHistory(prev => prev.map(action => 
                            action.id === lastRegularActionId && action.type !== 'search'
                                ? { ...action, status: 'completed' }
                                : action
                        ));
                    }
                    
                    // Add new regular action
                    const newActionId = Date.now() + Math.random();
                    addActionToHistory(updateData.message, 0, 'in_progress', null, 'regular', newActionId);
                    setLastRegularActionId(newActionId);
                    
                    // ❌ REMOVED: Do not iterate and add follow_up_queries here.
                    // if (updateData.follow_up_queries) {
                    //     updateData.follow_up_queries.forEach(q => addActionToHistory(`- ${q}`, 0, 'in_progress'));
                    // }
                }
            };
    
            console.log('Sending query with data:', {
                query: originalQuery,
                pbixFile: pbixFile,
                sessionId: pbixFile?.sessionId,
                conversationHistory: summarizedHistory
            });
            
            // For previously uploaded files, we don't have a sessionId, but we can still send the query
            // The backend will handle this case appropriately
            
            const response = await sendPowerBIQueryWithUpdates(
                originalQuery, 
                pbixFile, 
                handleRealTimeUpdate,
                summarizedHistory
            );
    
            if (response.type === 'clarification_needed') {
                setIsWaitingForClarifications(true);
                setClarificationFlow({
                    active: true,
                    questions: response.user_clarifications,
                    answers: {},
                    originalQuery: originalQuery,
                    currentIndex: 0,
                    clarificationSessionKey: response.clarification_session_key,
                });
                const firstQuestion = response.user_clarifications[0];
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: `I have a quick question to help me answer accurately: ${firstQuestion}`,
                    timestamp: new Date(),
                    messageType: 'clarification_question'
                }]);
                // Keep thinking process visible and in processing state to show search steps
                setThinkingProcess(prev => ({ ...prev, isCompleted: false }));
                return; // Stop here and wait for user clarification
            }
    
            if (response.answer) {
                // Mark the last regular action as completed
                if (lastRegularActionId) {
                    setActionHistory(prev => prev.map(action => 
                        action.id === lastRegularActionId && action.type !== 'search'
                            ? { ...action, status: 'completed' }
                            : action
                    ));
                }
                
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response.answer,
                    timestamp: new Date(),
                    messageType: 'final_response'
                };
                setMessages(prev => [...prev, assistantMessage]);
                
                // Add assistant response to conversation history with RAG context key
                setConversationHistory(prev => [...prev, {
                    role: 'assistant',
                    content: response.answer,
                    ragContextKey: response.rag_context_key || null,
                    timestamp: new Date()
                }]);
                
                setThinkingProcess(prev => ({ ...prev, isCompleted: true }));
            } else {
                throw new Error("Received an empty final response from the server.");
            }
    
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message || 'Failed to send message.');
            const errorMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.',
                timestamp: new Date(),
                messageType: 'error_response'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputMessage, isLoading, pbixFile, conversationHistory, addActionToHistory, summarizeConversationHistory]);

    // Auto-send initial message if provided
    useEffect(() => {
        if (initialMessage && pbixFile && !initialMessageSent) {
            console.log('Auto-send triggered with:', { initialMessage, pbixFile });
            // Wait a moment for the component to be fully mounted, then auto-send
            const timer = setTimeout(() => {
                console.log('Calling handleSendMessage with initial message');
                handleSendMessage(initialMessage);
                setInitialMessageSent(true);
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [initialMessage, pbixFile, handleSendMessage, initialMessageSent]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage();
        }
    };

    // Inline clarification handlers
    const submitCurrentClarificationAnswer = async () => {
        if (!clarificationFlow.active) return;
        const trimmed = currentClarificationAnswer.trim();
        if (!trimmed) return;
        const totalQuestions = clarificationFlow.questions.length;
        const currentQuestionNumber = clarificationFlow.currentIndex + 1;
        // Record answer in thinking process timeline
        addActionToHistory(`Answered clarification ${currentQuestionNumber}/${totalQuestions}` , 1, 'completed');
        // Add user's answer as a message
        setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'user',
            content: trimmed,
            timestamp: new Date(),
            messageType: 'clarification_answer'
        }]);
        // Store answer
        const nextAnswers = { ...clarificationFlow.answers, [clarificationFlow.currentIndex]: trimmed };
        const hasMore = clarificationFlow.currentIndex + 1 < clarificationFlow.questions.length;
        if (hasMore) {
            const nextIndex = clarificationFlow.currentIndex + 1;
            setClarificationFlow(prev => ({ ...prev, answers: nextAnswers, currentIndex: nextIndex }));
            setCurrentClarificationAnswer('');
            // Ask next question
            setMessages(prev => [...prev, {
                id: Date.now() + 2,
                type: 'assistant',
                content: `Question ${nextIndex + 1}/${clarificationFlow.questions.length}: ${clarificationFlow.questions[nextIndex]}`,
                timestamp: new Date(),
                messageType: 'clarification_question'
            }]);
            addActionToHistory(`Asking clarification ${nextIndex + 1}/${totalQuestions}`, 1, 'in_progress');
            return;
        }

        // Last answer → send batch to backend
        if (!pbixFile) {
            setError('No Power BI file available for clarifications');
            return;
        }
        setIsProcessingClarifications(true);
        setIsWaitingForClarifications(false);
        setCurrentClarificationAnswer('');
        addActionToHistory(`Submitting clarifications (${totalQuestions} answers)`, 1, 'in_progress');
        setThinkingProcess(prev => ({
            ...prev,
            currentAction: 'Applying clarifications and continuing analysis...'
        }));
        try {
            // Map to question -> answer
            const clarificationsPayload = {};
            clarificationFlow.questions.forEach((q, idx) => {
                const ans = idx === clarificationFlow.currentIndex ? trimmed : nextAnswers[idx];
                if (ans) clarificationsPayload[q] = ans;
            });
            const response = await sendUserClarifications(
                clarificationFlow.originalQuery,
                clarificationsPayload,
                pbixFile.sessionId,
                clarificationFlow.clarificationSessionKey
            );
            console.log('Submitted clarifications with session key:', clarificationFlow.clarificationSessionKey);
            
            // The new API only returns a simple answer, no more complex iteration handling
            addActionToHistory('Clarifications applied', 1, 'completed');
            setThinkingProcess(prev => ({
                ...prev,
                currentAction: 'Generating final response...',
                isCompleted: false // Keep processing until final response is displayed
            }));
            
            const assistantMessage = {
                id: Date.now() + 4,
                type: 'assistant',
                content: response.answer || 'I apologize, but I couldn\'t generate a response. Please try rephrasing your question.',
                timestamp: new Date(),
                messageType: 'final_response'
            };
            setMessages(prev => [...prev, assistantMessage]);
            
            // Mark thinking process as completed after adding the final response
            setThinkingProcess(prev => ({
                ...prev,
                isCompleted: true
            }));
            
            clarificationDialogOpenRef.current = false;
            setClarificationFlow({ active: false, questions: [], answers: {}, originalQuery: '', currentIndex: 0, clarificationSessionKey: null });
        } catch (err) {
            console.error('Error processing clarifications:', err);
            setError(err.message || 'Failed to process clarifications. Please try again.');
        } finally {
            setIsProcessingClarifications(false);
        }
    };

    // Constants to prevent re-renders
    const CLEAR_HISTORY_FALSE = false;
    const FADE_IN_TRUE = true;
    const FADE_TIMEOUT = 300;

    const MessageBubble = React.memo(({ message, messageIndex, totalMessages }) => {
        const isUser = message.type === 'user';
        
        return (
            <Box mb={2}>
                {isUser ? (
                    // User message - keep original styling
                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        alignItems="flex-start"
                        gap={1}
                    >
                        <Box
                            sx={{
                                maxWidth: '75%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end'
                            }}
                        >
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                    color: theme.palette.text.primary,
                                    borderRadius: '18px 0px 18px 18px',
                                    maxWidth: '100%',
                                    display: 'inline-block',
                                    width: 'fit-content'
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.5,
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    // AI message - ChatGPT/Cursor style (no icon, no background box)
                    <Box
                        sx={{
                            width: '100%',
                            py: 2,
                            px: 0
                        }}
                    >
                        <MarkdownRenderer 
                            content={message.content || ''}
                            variant="body1"
                            sx={{
                                fontSize: '0.95rem',
                                lineHeight: 1.6,
                                color: theme.palette.text.primary
                            }}
                        />
                        
                        {/* Action buttons for assistant messages - only show for final responses */}
                        {message.messageType === 'final_response' && (
                            <Box display="flex" alignItems="center" gap={1} mt={1.5} justifyContent="flex-end">
                                {/* Confidence indicator */}
                                {message.confidence && (
                                    <Chip
                                        label={`Confidence: ${message.confidence}`}
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: 20,
                                            bgcolor: message.confidence === 'high' 
                                                ? alpha(theme.palette.success.main, 0.1)
                                                : message.confidence === 'medium'
                                                ? alpha(theme.palette.warning.main, 0.1)
                                                : alpha(theme.palette.error.main, 0.1),
                                            color: message.confidence === 'high' 
                                                ? theme.palette.success.main
                                                : message.confidence === 'medium'
                                                ? theme.palette.warning.main
                                                : theme.palette.error.main
                                        }}
                                    />
                                )}
                                
                                {/* Copy button */}
                                <Tooltip title={copySuccess ? "Copied!" : "Copy response"}>
                                    <Button
                                        size="small"
                                        onClick={() => handleCopyText(message.content)}
                                        onMouseEnter={() => setCopyButtonHovered(true)}
                                        onMouseLeave={() => setCopyButtonHovered(false)}
                                        sx={{
                                            minWidth: 'auto',
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1.5,
                                            bgcolor: 'transparent',
                                            color: 'transparent',
                                            p: 0,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                transform: 'scale(1.05)'
                                            },
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Copy 
                                            size={16} 
                                            color={copyButtonHovered ? theme.palette.primary.main : theme.palette.text.secondary}
                                        />
                                    </Button>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );
    });

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box 
                sx={{ 
                    bgcolor: theme.palette.background.paper,
                    py: 1.5,
                    px: 3,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    {/* Back Button - only show when not inline */}
                    {!isInline && (
                        <Tooltip title="Back to file management">
                            <Button
                                onClick={onBack}
                                sx={{
                                    minWidth: 'auto',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'transparent',
                                    color: theme.palette.text.secondary,
                                    p: 0,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <ArrowLeft size={20} />
                            </Button>
                        </Tooltip>
                    )}
                    
                    {/* File Name - only show when not inline */}
                    {!isInline && (
                        <Typography variant="h6" component="h1" sx={{ 
                            fontWeight: 600, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif",
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {pbixFile?.name}
                        </Typography>
                    )}

                    {/* Close Button - only show when used inline */}
                    {onCloseChat && (
                        <Tooltip title="Close chat">
                            <Button
                                onClick={onCloseChat}
                                sx={{
                                    minWidth: 'auto',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'transparent',
                                    color: theme.palette.text.secondary,
                                    p: 0,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                        color: theme.palette.error.main,
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <XIcon size={20} />
                            </Button>
                        </Tooltip>
                    )}
                </Box>
            </Box>
            
            {/* Chat Messages Area */}
            <Box 
                sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    py: 4,
                    px: 4,
                    bgcolor: theme.palette.background.chat,
                    position: 'relative'
                }}
            >
                {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const isClarificationQuestion = isWaitingForClarifications && message.type === 'assistant' && isLastMessage;
                    
                    return (
                        <React.Fragment key={message.id}>
                            {/* Show thinking process before clarification questions */}
                            {isClarificationQuestion && thinkingProcess.isVisible && (
                                <Box mb={2}>
                                    <ThinkingProcess
                                        isVisible={thinkingProcess.isVisible}
                                        currentAction={thinkingProcess.currentAction}
                                        followUpQueries={thinkingProcess.followUpQueries}
                                        clearHistory={false}
                                        isCompleted={thinkingProcess.isCompleted || false}
                                        ragDetails={null}
                                        actionHistory={actionHistory}
                                    />
                                </Box>
                            )}
                            
                            {/* Show thinking process before the last message (final response) - but not when waiting for clarifications */}
                            {thinkingProcess.isVisible && isLastMessage && message.type === 'assistant' && !isWaitingForClarifications && (
                                <Box mb={2}>
                                    <ThinkingProcess
                                        isVisible={thinkingProcess.isVisible}
                                        currentAction={thinkingProcess.currentAction}
                                        followUpQueries={thinkingProcess.followUpQueries}
                                        clearHistory={CLEAR_HISTORY_FALSE}
                                        isCompleted={thinkingProcess.isCompleted || false}
                                        ragDetails={message.ragDetails}
                                        actionHistory={actionHistory}
                                    />
                                </Box>
                            )}
                            
                            <MessageBubble 
                                message={message} 
                                messageIndex={index} 
                                totalMessages={messages.length} 
                            />
                        </React.Fragment>
                    );
                })}
                
                {/* Show thinking process during processing (when no final response yet) - but not when waiting for clarifications */}
                {thinkingProcess.isVisible && messages.length > 0 && messages[messages.length - 1].type !== 'assistant' && !isWaitingForClarifications && (
                    <Box mb={2}>
                        <ThinkingProcess
                            isVisible={thinkingProcess.isVisible}
                            currentAction={thinkingProcess.currentAction}
                            followUpQueries={thinkingProcess.followUpQueries}
                            clearHistory={false}
                            isCompleted={thinkingProcess.isCompleted || false}
                            ragDetails={null}
                            actionHistory={actionHistory}
                        />
                    </Box>
                )}
                
                <div ref={messagesEndRef} />
            </Box>

            {/* Error Alert */}
            {error && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <Alert 
                        severity="error" 
                        onClose={() => setError(null)}
                        sx={{ borderRadius: 2 }}
                    >
                        {error}
                    </Alert>
                </Box>
            )}

            {/* Input Area (normal or clarification mode) */}
            <Box 
                sx={{ 
                    p: 4, 
                    bgcolor: theme.palette.background.chat,
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
                }}
            >
                {clarificationFlow.active ? (
                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            value={currentClarificationAnswer}
                            onChange={(e) => setCurrentClarificationAnswer(e.target.value)}
                            onKeyDown={handleClarificationKeyDown}
                            placeholder={`Answer: Question ${clarificationFlow.currentIndex + 1}/${clarificationFlow.questions.length}`}
                            variant="outlined"
                            disabled={isProcessingClarifications}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: theme.palette.background.chat,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                    color: theme.palette.text.primary,
                                    pr: currentClarificationAnswer.trim() ? 7 : 2, // Add right padding when button is visible
                                    '&:hover': { 
                                        bgcolor: theme.palette.background.chat,
                                        borderColor: alpha(theme.palette.input.focusBorder, 0.3)
                                    },
                                    '&.Mui-focused': { 
                                        bgcolor: theme.palette.background.chat,
                                        borderColor: theme.palette.input.focusBorder,
                                        boxShadow: `0 0 0 2px ${alpha(theme.palette.input.focusBorder, 0.1)}`
                                    }
                                },
                                '& .MuiInputBase-input': {
                                    color: theme.palette.text.primary
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: theme.palette.text.secondary,
                                    opacity: 1
                                }
                            }}
                        />
                        {currentClarificationAnswer.trim() && (
                            <Button
                                onClick={submitCurrentClarificationAnswer}
                                disabled={isProcessingClarifications}
                                variant="contained"
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    minWidth: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: theme.palette.primary.main,
                                    '&:hover': { 
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-50%) scale(1.05)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    },
                                    '&:disabled': { 
                                        bgcolor: alpha(theme.palette.primary.main, 0.3),
                                        transform: 'translateY(-50%)',
                                        boxShadow: 'none'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {isProcessingClarifications ? (
                                    <LoadingSpinner size={16} compact />
                                ) : (
                                    clarificationFlow.currentIndex + 1 === clarificationFlow.questions.length ? 'Submit' : 'Next'
                                )}
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            ref={inputRef}
                            fullWidth
                            multiline
                            maxRows={4}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about your Power BI dataset..."
                            variant="outlined"
                            disabled={isLoading}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: theme.palette.background.chat,
                                    border: `1px solid ${theme.palette.input.border}`,
                                    color: theme.palette.text.primary,
                                    pr: inputMessage.trim() ? 7 : 2, // Add right padding when button is visible
                                    '&:hover': { 
                                        bgcolor: theme.palette.background.chat,
                                        borderColor: alpha(theme.palette.input.focusBorder, 0.3)
                                    },
                                    '&.Mui-focused': { 
                                        bgcolor: theme.palette.background.chat,
                                        borderColor: theme.palette.input.focusBorder,
                                        boxShadow: `0 0 0 2px ${alpha(theme.palette.input.focusBorder, 0.1)}`
                                    }
                                },
                                '& .MuiInputBase-input': {
                                    color: theme.palette.text.primary
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: theme.palette.text.secondary,
                                    opacity: 1
                                }
                            }}
                        />
                        {inputMessage.trim() && (
                            <Button
                                onClick={handleSendMessage}
                                disabled={isLoading}
                                variant="contained"
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    minWidth: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: theme.palette.primary.main,
                                    '&:hover': { 
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-50%) scale(1.05)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    },
                                    '&:disabled': { 
                                        bgcolor: alpha(theme.palette.primary.main, 0.3),
                                        transform: 'translateY(-50%)',
                                        boxShadow: 'none'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {isLoading ? (
                                    <LoadingSpinner size={16} compact />
                                ) : (
                                    <PaperPlaneRight size={16} />
                                )}
                            </Button>
                        )}
                    </Box>
                )}
            </Box>

        </Box>
    );
};

export default ChatPage;
