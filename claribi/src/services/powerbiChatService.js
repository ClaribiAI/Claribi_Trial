import api from './api';

const isDev = import.meta.env && import.meta.env.DEV;

/**
 * Send a Power BI related query to the chat assistant
 * @param {string} query - The user's question about Power BI
 * @param {Object} pbixFile - Optional uploaded PBIX file metadata
 * @returns {Promise<Object>} The assistant's response
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
        if (isDev) console.error('Error uploading Power BI file:', error);
        
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
            } else if (status === 403) {
                // Handle upload limit reached - show purchase plan message
                throw new Error(errorMessage || 'You have already uploaded a file. To upload more files, please purchase a plan by visiting www.claribi.ai/claribi-console');
            } else if (status === 500) {
                throw new Error('Server error during processing. Please try again.');
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
 * Get list of previously uploaded PBIX files available for chat
 * @returns {Promise<Array>} Array of uploaded files with metadata
 */
export const getUploadedFiles = async () => {
    try {
        const response = await api.get('/powerbi-chat/list-files');
        return response.data.files || [];
    } catch (error) {
        if (isDev) console.error('Error fetching uploaded files:', error);
        
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
