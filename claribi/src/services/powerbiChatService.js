import api from './api';
import csrfService from './csrfService';

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
 * @returns {Promise<Object>} The assistant's response with RAG details
 */
export const sendPowerBIQueryWithUpdates = async (query, pbixFile = null, onUpdate = null) => {
    try {
        const requestData = {
            query: query,
            session_id: pbixFile?.sessionId || null
        };

        // Use fetch for Server-Sent Events
        console.log('Sending streaming request to /powerbi-chat/query-stream with data:', requestData);
        
        // Get CSRF token
        const csrfToken = await csrfService.getToken();
        console.log('CSRF token for streaming request:', csrfToken ? 'present' : 'missing');
        
        const response = await fetch('/powerbi-chat/query-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/plain',
                'X-CSRFToken': csrfToken || ''
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Streaming response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResult = null;

        try {
            while (true) {
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
                            } else if (data.type === 'final') {
                                console.log('Final result received:', data);
                                finalResult = data;
                            } else if (data.type === 'clarification_needed') {
                                // Handle clarification needed response
                                console.log('Clarification needed received:', data);
                                finalResult = data;
                            }
                        } catch (parseError) {
                            console.warn('Error parsing SSE data:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // If no final result was received, it might be because clarifications are needed
        if (!finalResult) {
            console.log('No final result received, returning clarification_needed');
            return { type: 'clarification_needed', message: 'Waiting for user clarifications' };
        }
        
        console.log('Final result received:', finalResult);
        return finalResult;
    } catch (error) {
        console.error('Error sending Power BI query with updates:', error);
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
            timeout: 120000, // 2 minutes for file uploads
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
        
        // Handle specific error types
        if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
            throw new Error('Connection was interrupted during upload. Please try again with a smaller file or check your internet connection.');
        }
        
        if (error.response) {
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               `Upload failed: ${error.response.status}`;
            throw new Error(errorMessage);
        } else if (error.request) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Upload timed out. The file might be too large or the server is taking too long to process. Please try again.');
            }
            throw new Error('Network error. Please check your connection and try again.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred during upload');
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
