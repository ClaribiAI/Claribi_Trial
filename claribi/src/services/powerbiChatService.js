import api from './api';

/**
 * Send a Power BI related query to the chat assistant
 * @param {string} query - The user's question about Power BI
 * @param {Object} pbixFile - Optional uploaded PBIX file metadata
 * @returns {Promise<Object>} The assistant's response
 */
export const sendPowerBIQuery = async (query, pbixFile = null) => {
    try {
        const response = await api.post('/powerbi-chat/query', {
            query: query,
            session_id: pbixFile?.sessionId || null, // Send session_id for RAG pipeline
            timestamp: new Date().toISOString()
        });

        return response.data;
    } catch (error) {
        console.error('Error sending Power BI query:', error);
        
        // Handle different types of errors
        if (error.response) {
            // Server responded with error status
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Server error: ${error.response.status}`;
            throw new Error(errorMessage);
        } else if (error.request) {
            // Network error
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            // Other error
            throw new Error(error.message || 'An unexpected error occurred');
        }
    }
};


/**
 * Send a Power BI query with real-time updates using Server-Sent Events
 * @param {string} query - The user's question about Power BI
 * @param {Object} pbixFile - Optional uploaded PBIX file metadata
 * @param {Function} onUpdate - Callback function for real-time updates
 * @param {Array} conversationHistory - Previous conversation history for context
 * @param {string} responseMode - Response detail level: 'detailed' or 'concise'
 * @param {AbortSignal} abortSignal - Optional abort signal to cancel the request
 * @returns {Promise<Object>} The assistant's response with RAG details
 */
export const sendPowerBIQueryWithUpdates = async (query, pbixFile = null, onUpdate = null, conversationHistory = [], responseMode = 'detailed', abortSignal = null) => {
    try {
        const requestData = {
            query: query,
            session_id: pbixFile?.sessionId || null,
            conversation_history: conversationHistory,
            response_mode: responseMode
        };

        // Use fetch for Server-Sent Events
        console.log('Sending streaming request to /powerbi-chat/query-stream with data:', requestData);
        
        // Get JWT token for authentication
        const jwtToken = localStorage.getItem('jwt_token');
        console.log('JWT token for streaming request:', jwtToken ? 'present' : 'missing');
        
        const response = await fetch('/powerbi-chat/query-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/plain',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            },
            body: JSON.stringify(requestData),
            signal: abortSignal
        });
        
        console.log('Streaming response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResult = null;
        let streamError = null;
        let streamWarning = null;

        try {
            while (true) {
                // Check if aborted
                if (abortSignal && abortSignal.aborted) {
                    console.log('Request aborted by user');
                    reader.cancel();
                    streamError = new Error('Request cancelled by user');
                    streamError.isCancelled = true;
                    break;
                }
                
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'update' && onUpdate) {
                                console.log('Sending update to handler:', data);
                                onUpdate(data);
                            } else if (data.type === 'warning') {
                                // Handle warning responses, including approaching limit
                                console.log('Warning received:', data);
                                if (data.warning === 'approaching_limit') {
                                    // Create a warning object
                                    const warningObj = {
                                        type: 'approaching_limit',
                                        message: data.message || 'You are approaching your usage limit.',
                                        feature_type: data.feature_type || 'chat'
                                    };
                                    streamWarning = warningObj;
                                    // Call onUpdate with warning so it can be displayed
                                    if (onUpdate) {
                                        onUpdate({ type: 'warning', ...warningObj });
                                    }
                                }
                            } else if (data.type === 'error') {
                                // Handle error responses, including usage limit exceeded
                                console.log('Error received:', data);
                                if (data.error === 'usage_limit_exceeded') {
                                    // Create a user-friendly error object
                                    const usageError = new Error(data.message || 'Usage limit exceeded');
                                    usageError.error = 'usage_limit_exceeded';
                                    usageError.current_usage = data.current_usage;
                                    usageError.limit = data.limit;
                                    usageError.feature_type = data.feature_type || 'chat';
                                    // Store error and break out of loop
                                    streamError = usageError;
                                    break;
                                } else {
                                    // Other errors
                                    streamError = new Error(data.message || 'An error occurred');
                                    break;
                                }
                            } else if (data.type === 'final') {
                                console.log('Final result received:', data);
                                finalResult = data;
                            } else if (data.type === 'clarification_needed') {
                                // Handle clarification needed response
                                console.log('Clarification needed received:', data);
                                finalResult = data;
                            }
                        } catch (parseError) {
                            // If it's a usage limit error, store it
                            if (parseError.error === 'usage_limit_exceeded') {
                                streamError = parseError;
                                break;
                            }
                            console.warn('Error parsing SSE data:', parseError);
                        }
                    }
                }
                
                // Break out of outer loop if we have an error
                if (streamError) {
                    break;
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        // Throw error if one occurred during streaming
        if (streamError) {
            console.log('Throwing stream error:', {
                error: streamError.error,
                message: streamError.message,
                hasErrorProperty: 'error' in streamError
            });
            throw streamError;
        }

        // If no final result was received, it might be because clarifications are needed
        if (!finalResult) {
            console.log('No final result received, returning clarification_needed');
            const result = { type: 'clarification_needed', message: 'Waiting for user clarifications' };
            // Include warning if present
            if (streamWarning) {
                result.warning = streamWarning;
            }
            return result;
        }
        
        console.log('Final result received:', finalResult);
        // Include warning in final result if present
        if (streamWarning) {
            finalResult.warning = streamWarning;
        }
        return finalResult;
    } catch (error) {
        console.error('Error sending Power BI query with updates:', error);
        
        // Handle abort/cancellation
        if (error.name === 'AbortError' || error.isCancelled) {
            const cancelError = new Error('Request cancelled by user');
            cancelError.isCancelled = true;
            throw cancelError;
        }
        
        // Preserve the original error object and its properties (especially 'error' property for usage limit errors)
        if (error.error === 'usage_limit_exceeded') {
            // Preserve usage limit error with all its properties
            throw error;
        }
        // For other errors, create a new error but preserve the message
        throw new Error(error.message || 'An unexpected error occurred');
    }
};


/**
 * Upload a Power BI file for analysis
 * @param {File} file - The PBIX file to upload
 * @returns {Promise<Object>} Upload response with metadata
 */
export const uploadPowerBIFile = async (file, onProgress = null) => {
    try {
        const formData = new FormData();
        formData.append('pbix_file', file);

        const response = await api.post('/powerbi-chat/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes for file uploads (increased from 2 minutes)
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading Power BI file:', error);
        
        // Handle specific error types with more detailed messages
        if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
            throw new Error('Connection was interrupted during upload. This may be due to server restart or network issues. Please try again.');
        }
        
        if (error.response) {
            const status = error.response.status;
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Upload failed: ${status}`;
            
            // Handle specific HTTP status codes
            if (status === 413) {
                throw new Error('File too large. Please try with a smaller file (under 100MB).');
            } else if (status === 400) {
                throw new Error('Invalid file format. Please ensure you are uploading a valid .pbix file.');
            } else if (status === 500) {
                throw new Error('Server error during processing. The server may have restarted. Please try again.');
            } else if (status === 503) {
                throw new Error('Server temporarily unavailable. Please try again in a few moments.');
            }
            
            throw new Error(errorMessage);
        } else if (error.request) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Upload timed out. The file might be too large or the server is taking too long to process. Please try again with a smaller file.');
            } else if (error.code === 'NETWORK_ERROR') {
                throw new Error('Network error. Please check your internet connection and try again.');
            }
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred during upload');
        }
    }
};

/**
 * Reupload a Power BI file to replace existing metadata
 * @param {string} collectionName - The collection name to reupload
 * @param {File} file - The PBIX file to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Reupload response with metadata
 */
export const reuploadPowerBIFile = async (collectionName, file, onProgress = null) => {
    try {
        const formData = new FormData();
        formData.append('pbix_file', file);
        formData.append('collection_name', collectionName);

        const response = await api.post('/powerbi-chat/reupload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 300000, // 5 minutes for file uploads
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error reuploading Power BI file:', error);
        
        // Handle specific error types with more detailed messages
        if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
            throw new Error('Connection was interrupted during reupload. This may be due to server restart or network issues. Please try again.');
        }
        
        if (error.response) {
            const status = error.response.status;
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Reupload failed: ${status}`;
            
            // Handle specific HTTP status codes
            if (status === 413) {
                throw new Error('File too large. Please try with a smaller file (under 100MB).');
            } else if (status === 400) {
                throw new Error('Invalid file format or missing collection name. Please ensure you are uploading a valid .pbix file.');
            } else if (status === 500) {
                throw new Error('Server error during processing. The server may have restarted. Please try again.');
            } else if (status === 503) {
                throw new Error('Server temporarily unavailable. Please try again in a few moments.');
            }
            
            throw new Error(errorMessage);
        } else if (error.request) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Reupload timed out. The file might be too large or the server is taking too long to process. Please try again with a smaller file.');
            } else if (error.code === 'NETWORK_ERROR') {
                throw new Error('Network error. Please check your internet connection and try again.');
            }
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred during reupload');
        }
    }
};

/**
 * Delete a Power BI session (collection) from the vector database
 * @param {string} sessionId - The session ID to delete
 * @returns {Promise<Object>} Success confirmation
 */
export const deletePowerBISession = async (sessionId) => {
    try {
        const response = await api.delete('/powerbi-chat/delete-session', {
            data: { session_id: sessionId }
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting Power BI session:', error);
        throw new Error(error.response?.data?.error || 'Failed to delete session');
    }
};

/**
 * Send user clarifications to enhance the AI response
 * @param {string} originalQuery - The original user query
 * @param {Object} clarifications - Object mapping questions to user answers
 * @param {string} sessionId - The session ID for the Power BI file
 * @param {string} clarificationSessionKey - The clarification session key for context
 * @returns {Promise<Object>} The enhanced response with clarifications
 */
export const sendUserClarifications = async (originalQuery, clarifications, sessionId, clarificationSessionKey = null) => {
    try {
        const payload = {
            clarifications: clarifications,
            clarification_session_key: clarificationSessionKey
        };
        
        console.log('Sending clarifications to backend:', payload);
        
        const response = await api.post(
            '/powerbi-chat/clarification',
            payload,
            {
                // Clarification processing can take longer; increase timeout to 120s
                timeout: 120000
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error sending user clarifications:', error);
        
        // Handle different types of errors
        if (error.response) {
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Server error: ${error.response.status}`;
            throw new Error(errorMessage);
        } else if (error.request) {
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred');
        }
    }
};

/**
 * Get list of previously uploaded PBIX files available for chat
 * @returns {Promise<Array>} Array of uploaded files with metadata
 */
export const getUploadedFiles = async () => {
    try {
        const response = await api.get('/powerbi-chat/list-files');
        return response.data.files || [];
    } catch (error) {
        console.error('Error fetching uploaded files:', error);
        
        // Handle different types of errors
        if (error.response) {
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Server error: ${error.response.status}`;
            throw new Error(errorMessage);
        } else if (error.request) {
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred');
        }
    }
}; 
