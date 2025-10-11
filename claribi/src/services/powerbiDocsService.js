import api from './api';

export const analyzePowerBIFiles = async (pbixFile) => {
    const formData = new FormData();
    
    // Add the .pbix file
    formData.append('pbix_file', pbixFile);

    try {
        const response = await api.post('/api/powerbi-docs/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const analyzePowerBISection = async (pbixFile, section, customInstructions = '') => {
    const formData = new FormData();
    
    // Add the .pbix file
    formData.append('pbix_file', pbixFile);

    // Add custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
        formData.append('custom_instructions', customInstructions.trim());
    }

    try {
        const response = await api.post(`/api/powerbi-docs/analyze-section/${section}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const parseImprovementRecommendations = async (pbixFile) => {
    const formData = new FormData();
    
    // Add the .pbix file
    formData.append('pbix_file', pbixFile);

    try {
        const response = await api.post('/api/powerbi-docs/parse-recommendations', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const applyImprovementRecommendation = async (pbixFile, recommendationId) => {
    const formData = new FormData();
    
    // Add the .pbix file
    formData.append('pbix_file', pbixFile);

    try {
        const response = await api.post(`/api/powerbi-docs/apply-recommendation/${recommendationId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 0
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}; 