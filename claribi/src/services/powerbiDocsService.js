import api from './api';
import powerbiFileService from './powerbiFileService';

export const getUploadedFiles = async () => {
    try {
        const response = await api.get('/api/powerbi-docs/list-files');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getFileSummaries = async (collectionName) => {
    try {
        const response = await api.get(`/api/powerbi-docs/get-summaries/${collectionName}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getDiagnosticsKPIs = async (collectionName) => {
    try {
        const response = await api.get(`/api/powerbi-docs/get-diagnostics-kpis/${collectionName}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getDiagnosticsKPIDetails = async (collectionName, kpiType) => {
    try {
        const response = await api.get(`/api/powerbi-docs/get-diagnostics-kpi-details/${collectionName}/${kpiType}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getGeneratedDocs = async (collectionName) => {
    try {
        const response = await api.get(`/api/powerbi-docs/get-generated-docs/${collectionName}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const analyzePowerBISection = async (collectionName, section, customInstructions = '') => {
    const requestData = {
        collection_name: collectionName,
        custom_instructions: customInstructions.trim()
    };

    try {
        const response = await api.post(`/api/powerbi-docs/analyze-section/${section}`, requestData, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 0
        });
        
        const responseData = response.data;
        
        // Check for warning in response (approaching limit)
        if (responseData.warning && responseData.warning.type === 'approaching_limit') {
            // Add warning to response data for frontend to handle
            responseData.warning = responseData.warning;
        }
        
        return responseData;
    } catch (error) {
        // Check for usage limit exceeded error
        const errorData = error.response?.data || error;
        
        // Handle usage limit exceeded - ensure we always show the friendly message
        if (errorData?.error === 'usage_limit_exceeded') {
            // Create a user-friendly error object with the message as the main error message
            const friendlyMessage = errorData.message || 'You have reached your usage limit. Please upgrade your plan to continue generating documentation.';
            const usageError = new Error(friendlyMessage);
            usageError.error = 'usage_limit_exceeded';
            usageError.message = friendlyMessage; // Ensure message is set
            usageError.current_usage = errorData.current_usage;
            usageError.limit = errorData.limit;
            usageError.feature_type = errorData.feature_type || 'docs';
            throw usageError;
        }
        
        // For other errors, try to extract a friendly message
        if (error.response?.data?.message) {
            const friendlyError = new Error(error.response.data.message);
            friendlyError.error = error.response.data.error;
            throw friendlyError;
        }
        
        throw errorData;
    }
};

export const parseImprovementRecommendations = async (collectionName) => {
    const requestData = {
        collection_name: collectionName
    };

    try {
        const response = await api.post('/api/powerbi-docs/parse-recommendations', requestData, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const applyImprovementRecommendation = async (collectionName, recommendationId) => {
    const requestData = {
        collection_name: collectionName
    };

    try {
        const response = await api.post(`/api/powerbi-docs/apply-recommendation/${recommendationId}`, requestData, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const rewriteDocumentationSection = async (collectionName, sectionName, selectedText, startPosition, endPosition, rewriteStyle) => {
    const requestData = {
        collection_name: collectionName,
        section_name: sectionName,
        selected_text: selectedText,
        start_position: startPosition,
        end_position: endPosition,
        rewrite_style: rewriteStyle
    };

    try {
        const response = await api.post('/api/powerbi-docs/rewrite-section', requestData, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 0
        });
        
        return response.data;
    } catch (error) {
        const errorData = error.response?.data || error;
        
        // Create a user-friendly error
        if (error.response?.data?.message) {
            const friendlyError = new Error(error.response.data.message);
            friendlyError.error = error.response.data.error;
            throw friendlyError;
        }
        
        throw errorData;
    }
};

// Re-export shared file operations
export { powerbiFileService }; 