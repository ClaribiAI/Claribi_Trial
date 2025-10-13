import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Card,
    CardContent,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Divider,
    Avatar,
    Snackbar,
    Tooltip
} from '@mui/material';
import {
    PaperPlaneRight,
    ChatCircle,
    User,
    Robot,
    Lightbulb,
    ChartBar,
    GearSix,
    Question,
    CloudArrowUp,
    FileText,
    CheckCircle
} from '@phosphor-icons/react';
import { sendPowerBIQuery, sendPowerBIQueryWithUpdates, uploadPowerBIFile, deletePowerBISession, sendUserClarifications, getUploadedFiles } from '../../services/powerbiChatService';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';
import ThinkingProcess from '../../components/ui/ThinkingProcess';
import FileSelectionDialog from '../../components/ui/FileSelectionDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
// Inline clarification flow replaces modal dialog

const PowerBIChat = () => {
    const theme = useTheme();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pbixFile, setPbixFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [isNewlyUploaded, setIsNewlyUploaded] = useState(false);
    const [thinkingProcess, setThinkingProcess] = useState({
        isVisible: false,
        currentAction: '',
        followUpQueries: [],
        isCompleted: false
    });
    const [actionHistory, setActionHistory] = useState([]);
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
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const clarificationDialogOpenRef = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Function to add action to history
    const addActionToHistory = (action, step, status, searchQuery = null, type = 'regular', searchId = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const newAction = {
            id: searchId || Date.now() + Math.random(), // Use searchId if provided, otherwise generate unique ID
            action,
            timestamp,
            step,
            status,
            searchQuery,
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


    // Cleanup: Delete session when component unmounts
    useEffect(() => {
        return () => {
            // Only cleanup if we have a session ID and it's a newly uploaded file
            // (previously uploaded files should not be deleted when switching between them)
            if (pbixFile?.sessionId && isNewlyUploaded) {
                deletePowerBISession(pbixFile.sessionId).catch(error => {
                    console.error('Error cleaning up session:', error);
                });
            }
        };
    }, []); // Empty dependency array - only run on unmount


    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;
        
        // Check if PBIX file is uploaded
        if (!pbixFile) {
            setError('Please upload a Power BI file first before asking questions.');
            return;
        }
    
        const userMessage = { id: Date.now(), type: 'user', content: inputMessage.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        const originalQuery = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);
        setError(null);
        setActionHistory([]); // Clear previous history
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
                    // Add search step to action history
                    addActionToHistory(`Search: ${updateData.search_query}`, 0, 'in_progress', updateData.search_query, 'search', updateData.search_id);
                } else if (updateData.step === 'search_completed') {
                    console.log('Processing search_completed update:', updateData);
                    // Update existing search step to completed status
                    setActionHistory(prev => prev.map(action => 
                        action.searchId === updateData.search_id 
                            ? { 
                                ...action, 
                                status: 'completed', 
                                action: `Search: ${action.searchQuery} (${updateData.result_count} results)`,
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
                    addActionToHistory(updateData.message, 0, 'in_progress');
                    
                    // ❌ REMOVED: Do not iterate and add follow_up_queries here.
                    // if (updateData.follow_up_queries) {
                    //     updateData.follow_up_queries.forEach(q => addActionToHistory(`- ${q}`, 0, 'in_progress'));
                    // }
                }
            };
    
            const response = await sendPowerBIQueryWithUpdates(
                originalQuery, 
                pbixFile, 
                handleRealTimeUpdate
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
                    timestamp: new Date()
                }]);
                // Keep thinking process visible to show search steps
                setThinkingProcess(prev => ({ ...prev, isCompleted: true }));
                return; // Stop here and wait for user clarification
            }
    
            if (response.answer) {
                const assistantMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: response.answer,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
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
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };


    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage();
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pbix')) {
            setError('Please select a valid .pbix file');
            return;
        }

        // Validate file size (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size must be less than 100MB');
            return;
        }

        setUploadLoading(true);
        setUploadProgress(0);
        setError(null);
        setRetryCount(0);

        try {
            const response = await uploadPowerBIFile(file, (progress) => {
                setUploadProgress(progress);
            });
            
            setPbixFile({
                name: file.name,
                size: file.size,
                uploadId: response.upload_id || Date.now(),
                sessionId: response.session_id, // Store session_id for RAG queries
                metadata: response.metadata
            });
            setIsNewlyUploaded(true); // Mark as newly uploaded

            // Show success message
            setShowUploadSuccess(true);
            setTimeout(() => setShowUploadSuccess(false), 6000);

            // Add system message about file upload with metadata details
            const metadata = response.metadata || {};
            const systemMessage = {
                id: Date.now(),
                type: 'assistant',
                content: `Great! I've analyzed your Power BI file "${file.name}". I found ${metadata.tables_count || 0} tables, ${metadata.measures_count || 0} measures, ${metadata.relationships_count || 0} relationships, and ${metadata.power_query_scripts_count || 0} Power Query scripts. I can now provide specific insights about your data model and help with any questions about your dataset.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, systemMessage]);

        } catch (err) {
            console.error('Error uploading file:', err);
            
            // Retry logic for connection errors
            if ((err.message.includes('Connection was interrupted') || 
                 err.message.includes('Network error') || 
                 err.message.includes('ECONNRESET')) && 
                retryCount < 2) {
                setRetryCount(prev => prev + 1);
                setError(`Upload failed (attempt ${retryCount + 1}/3). Retrying...`);
                
                // Wait 2 seconds before retry
                setTimeout(() => {
                    handleFileUpload({ target: { files: [file] } });
                }, 2000);
                return;
            }
            
            setError(err.message || 'Failed to upload file. Please try again.');
            setRetryCount(0);
        } finally {
            setUploadLoading(false);
            setUploadProgress(0);
        }
    };

    const handleRemoveFile = async () => {
        // Delete the session from the backend if it exists
        if (pbixFile?.sessionId) {
            try {
                await deletePowerBISession(pbixFile.sessionId);
                console.log('Session deleted successfully');
            } catch (error) {
                console.error('Error deleting session:', error);
                // Continue with file removal even if session deletion fails
            }
        }
        
        setPbixFile(null);
        setIsNewlyUploaded(false); // Reset the flag
        setShowUploadSuccess(false);
        
        // Clear messages to return to welcome screen
        setMessages([]);
        
        // Clear any ongoing processes
        setThinkingProcess({
            isVisible: false,
            currentAction: '',
            followUpQueries: [],
            isCompleted: false
        });
        setActionHistory([]);
        setError(null);
    };

    const handleFileSelect = (selectedFile) => {
        setPbixFile(selectedFile);
        setIsNewlyUploaded(false); // Mark as previously uploaded file
        setShowUploadSuccess(true);
        setTimeout(() => setShowUploadSuccess(false), 6000);

        // Add system message about file selection
        const metadata = selectedFile.metadata || {};
        const systemMessage = {
            id: Date.now(),
            type: 'assistant',
            content: `Great! I've loaded your previously uploaded Power BI file "${selectedFile.name}". I found ${metadata.tables_count || 0} tables, ${metadata.measures_count || 0} measures, ${metadata.relationships_count || 0} relationships, and ${metadata.power_query_scripts_count || 0} Power Query scripts. I can now provide specific insights about your data model and help with any questions about your dataset.`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
    };

    const handleUploadNew = () => {
        setShowFileSelection(false);
        fileInputRef.current?.click();
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
			timestamp: new Date()
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
				timestamp: new Date()
			}]);
			addActionToHistory(`Asking clarification ${nextIndex + 1}/${totalQuestions}`, 1, 'in_progress');
			return;
		}

		// Last answer → send batch to backend
		if (!pbixFile?.sessionId) {
			setError('No Power BI file session available for clarifications');
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
				isCompleted: true
			}));
			
			const assistantMessage = {
				id: Date.now() + 4,
				type: 'assistant',
				content: response.answer || 'I apologize, but I couldn\'t generate a response. Please try rephrasing your question.',
				timestamp: new Date()
			};
			setMessages(prev => [...prev, assistantMessage]);
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

    const MessageBubble = React.memo(({ message }) => {
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
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: theme.palette.primary.main,
                                    color: 'white',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 12,
                                        right: -6,
                                        width: 0,
                                        height: 0,
                                        borderLeft: `6px solid ${theme.palette.primary.main}`,
                                        borderTop: '6px solid transparent',
                                        borderBottom: '6px solid transparent'
                                    }
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.5,
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            </Paper>
                            
                        </Box>
                        
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                color: theme.palette.secondary.main
                            }}
                        >
                            <User size={16} />
                        </Avatar>
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
                                color: 'text.primary'
                            }}
                        />
                        
                        {/* Confidence indicator for assistant messages */}
                        {message.confidence && (
                            <Box display="flex" alignItems="center" gap={0.5} mt={1.5}>
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
                            </Box>
                        )}
                        
                    </Box>
                )}
            </Box>
        );
    });

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header - Only show when file is uploaded */}
            {pbixFile && (
                <Box 
                    sx={{ 
                        bgcolor: 'background.paper',
                        py: 1.5,
                        px: 3,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}
                >
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                        <Box display="flex" alignItems="center" gap={2}>
                            <Box 
                                sx={{ 
                                    p: 1, 
                                    borderRadius: 1.5, 
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: theme.palette.primary.main
                                }}
                            >
                                <ChatCircle size={20} />
                            </Box>
                            <Typography variant="h6" component="h1" sx={{ 
                                fontWeight: 600, 
                                color: theme.palette.text.primary,
                                fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                            }}>
                                Power BI Assistant
                            </Typography>
                        </Box>
                        
                        {/* File Status Display */}
                        <Chip
                            icon={<FileText size={16} />}
                            label={`${pbixFile.name} (${(pbixFile.size / 1024 / 1024).toFixed(1)} MB)`}
                            onDelete={handleRemoveFile}
                            color="primary"
                            variant="outlined"
                            sx={{
                                maxWidth: 280,
                                height: 32,
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    px: 1.5
                                },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '1rem'
                                }
                            }}
                        />
                    </Box>
                </Box>
            )}
            
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pbix"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Chat Messages Area */}
            <Box 
                sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    py: 4,
                    px: 4,
                    bgcolor: alpha(theme.palette.grey[50], 0.2),
                    position: 'relative'
                }}
            >
                {/* Welcome message when no file is uploaded */}
                {!pbixFile && messages.length === 0 && (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            textAlign: 'center',
                            py: 8,
                            px: 4
                        }}
                    >
                        <Box 
                            sx={{ 
                                p: 4, 
                                borderRadius: 4, 
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                                mb: 4,
                                border: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                        >
                            <ChartBar size={64} />
                        </Box>
                        <Typography variant="h3" sx={{ 
                            fontWeight: 700, 
                            mb: 2, 
                            color: theme.palette.text.primary,
                            fontFamily: "'Cal Sans', 'Nunito Sans', sans-serif"
                        }}>
                            Welcome to Power BI Assistant
                        </Typography>
                        <Typography variant="h6" sx={{ 
                            color: theme.palette.text.secondary, 
                            mb: 6, 
                            maxWidth: 600,
                            lineHeight: 1.6,
                            fontWeight: 400
                        }}>
                            Upload a Power BI (.pbix) file to get started. I'll analyze your data model and provide expert assistance with measures, troubleshooting, and best practices.
                        </Typography>
                        
                        {/* Upload and Select Buttons */}
                        <Box display="flex" gap={3} mt={2}>
                            <Button
                                variant="contained"
                                startIcon={<FileText size={20} />}
                                onClick={() => setShowFileSelection(true)}
                                sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    height: 48,
                                    bgcolor: theme.palette.primary.main,
                                    '&:hover': { 
                                        bgcolor: theme.palette.primary.dark,
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Select File
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={!uploadLoading ? <CloudArrowUp size={20} /> : null}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadLoading}
                                sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    height: 48,
                                    borderColor: theme.palette.primary.main,
                                    color: theme.palette.primary.main,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': { 
                                        borderColor: theme.palette.primary.dark,
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {uploadLoading ? (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <LoadingSpinner size={18} compact />
                                        <Typography variant="body2">
                                            Uploading... {uploadProgress}%
                                        </Typography>
                                    </Box>
                                ) : (
                                    'Upload New'
                                )}
                                {uploadLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            height: 3,
                                            bgcolor: 'primary.main',
                                            width: `${uploadProgress}%`,
                                            transition: 'width 0.3s ease'
                                        }}
                                    />
                                )}
                            </Button>
                        </Box>
                    </Box>
                )}
                
                {messages.map((message, index) => (
                    <React.Fragment key={message.id}>
                        {/* Show thinking process before the last message (final response) */}
                        {thinkingProcess.isVisible && index === messages.length - 1 && message.type === 'assistant' && (
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
                        <MessageBubble message={message} />
                    </React.Fragment>
                ))}
                
				{/* Show thinking process during processing (when no final response yet) */}
                {thinkingProcess.isVisible && messages.length > 0 && (messages[messages.length - 1].type !== 'assistant' || isWaitingForClarifications) && (
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

			{/* Input Area (normal or clarification mode) - Only show when file is uploaded */}
            {pbixFile && (
                <Box 
                    sx={{ 
                        p: 4, 
                        bgcolor: 'background.paper',
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
                    }}
                >
				{clarificationFlow.active ? (
					<Box display="flex" gap={1} alignItems="flex-end">
						<TextField
							fullWidth
							multiline
							maxRows={4}
							value={currentClarificationAnswer}
							onChange={(e) => setCurrentClarificationAnswer(e.target.value)}
							placeholder={`Answer: Question ${clarificationFlow.currentIndex + 1}/${clarificationFlow.questions.length}`}
							variant="outlined"
							disabled={isProcessingClarifications}
							sx={{
								'& .MuiOutlinedInput-root': {
									borderRadius: 3,
									bgcolor: alpha(theme.palette.grey[50], 0.3),
									border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
									'&:hover': { 
										bgcolor: alpha(theme.palette.grey[50], 0.5),
										borderColor: alpha(theme.palette.primary.main, 0.3)
									},
									'&.Mui-focused': { 
										bgcolor: 'background.paper',
										borderColor: theme.palette.primary.main,
										boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
									}
								}
							}}
						/>
						<Button
							onClick={submitCurrentClarificationAnswer}
							disabled={!currentClarificationAnswer.trim() || isProcessingClarifications}
							variant="contained"
							sx={{
								minWidth: 52,
								height: 52,
								borderRadius: 3,
								bgcolor: theme.palette.primary.main,
								'&:hover': { 
									bgcolor: theme.palette.primary.dark,
									transform: 'translateY(-1px)',
									boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
								},
								'&:disabled': { 
									bgcolor: alpha(theme.palette.primary.main, 0.3),
									transform: 'none',
									boxShadow: 'none'
								},
								transition: 'all 0.2s ease'
							}}
						>
							{isProcessingClarifications ? (
								<LoadingSpinner size={20} compact />
							) : (
								clarificationFlow.currentIndex + 1 === clarificationFlow.questions.length ? 'Submit' : 'Next'
							)}
						</Button>
					</Box>
				) : (
					<Box display="flex" gap={1} alignItems="flex-end">
						<TextField
							ref={inputRef}
							fullWidth
							multiline
							maxRows={4}
							value={inputMessage}
							onChange={(e) => setInputMessage(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={pbixFile ? "Ask me anything about Power BI..." : "Please upload a Power BI file first..."}
							variant="outlined"
							disabled={isLoading || !pbixFile}
							sx={{
								'& .MuiOutlinedInput-root': {
									borderRadius: 3,
									bgcolor: alpha(theme.palette.grey[50], 0.3),
									border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
									'&:hover': { 
										bgcolor: alpha(theme.palette.grey[50], 0.5),
										borderColor: alpha(theme.palette.primary.main, 0.3)
									},
									'&.Mui-focused': { 
										bgcolor: 'background.paper',
										borderColor: theme.palette.primary.main,
										boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`
									}
								}
							}}
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!inputMessage.trim() || isLoading || !pbixFile}
							variant="contained"
							sx={{
								minWidth: 52,
								height: 52,
								borderRadius: 3,
								bgcolor: theme.palette.primary.main,
								'&:hover': { 
									bgcolor: theme.palette.primary.dark,
									transform: 'translateY(-1px)',
									boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
								},
								'&:disabled': { 
									bgcolor: alpha(theme.palette.primary.main, 0.3),
									transform: 'none',
									boxShadow: 'none'
								},
								transition: 'all 0.2s ease'
							}}
						>
							{isLoading ? (
								<LoadingSpinner size={20} compact />
							) : (
								<PaperPlaneRight size={20} />
							)}
						</Button>
					</Box>
				)}
                </Box>
            )}

            {/* Success Snackbar */}
            <Snackbar
                open={showUploadSuccess}
                autoHideDuration={6000}
                onClose={() => setShowUploadSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 9999 }}
            >
                <Alert 
                    onClose={() => setShowUploadSuccess(false)} 
                    severity="success"
                    icon={<CheckCircle size={20} />}
                    sx={{ 
                        width: '100%',
                        boxShadow: 3,
                        fontFamily: "'Nunito Sans', sans-serif"
                    }}
                >
                    Power BI file uploaded and analyzed successfully! <strong>{pbixFile?.name}</strong>
                </Alert>
            </Snackbar>

            {/* File Selection Dialog */}
            <FileSelectionDialog
                open={showFileSelection}
                onClose={() => setShowFileSelection(false)}
                onFileSelect={handleFileSelect}
                onUploadNew={handleUploadNew}
            />

			{/* Inline clarification replaces modal */}
        </Box>
    );
};

export default PowerBIChat; 