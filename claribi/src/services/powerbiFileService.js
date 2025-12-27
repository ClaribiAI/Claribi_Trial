// Shared service for Power BI file operations
// Used by both Chat and Docs pages

import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class PowerBIFileService {
    async getUploadedFiles() {
        try {
            const response = await api.get('/powerbi-chat/list-files');
            return response.data.files || [];
        } catch (error) {
            console.error('Error fetching uploaded files:', error);
            throw new Error(`Failed to fetch files: ${error.message}`);
        }
    }

    async getFileSummaries(collectionName) {
        try {
            const response = await api.get(`/api/powerbi-docs/get-summaries/${collectionName}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching file summaries:', error);
            throw new Error(`Failed to fetch summaries: ${error.message}`);
        }
    }
}

// Export singleton instance
export default new PowerBIFileService();


