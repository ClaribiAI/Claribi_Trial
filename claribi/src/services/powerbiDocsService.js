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
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
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

// Re-export shared file operations
export { powerbiFileService }; 