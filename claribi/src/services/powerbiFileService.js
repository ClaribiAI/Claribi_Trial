// Shared service for Power BI file operations
// Used by both Chat and Docs pages

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class PowerBIFileService {
    async getUploadedFiles() {
        try {
            const response = await fetch(`${API_BASE_URL}/powerbi-chat/list-files`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Error fetching uploaded files:', error);
            throw new Error(`Failed to fetch files: ${error.message}`);
        }
    }

    async deleteFile(sessionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/powerbi-chat/delete-session`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ session_id: sessionId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async getFileSummaries(collectionName) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/powerbi-docs/get-summaries/${collectionName}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching file summaries:', error);
            throw new Error(`Failed to fetch summaries: ${error.message}`);
        }
    }
}

// Export singleton instance
export default new PowerBIFileService();


