import api from './api';

const reportService = {
  // Get project data
  getProject: async (projectId) => {
    try {
      const response = await api.get(`/project/${projectId}`);
      return response;
    } catch (error) {
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch project data'
        }
      };
    }
  },
  
  // Get all reports for a project
  getReports: async (projectId) => {
    try {
      const response = await api.get(`/project/${projectId}/reports`);
      return response;
    } catch (error) {
      // Return a structured empty response instead of throwing
      return {
        data: {
          success: false,
          error: error.userMessage || 'Failed to fetch reports',
          reports: []
        }
      };
    }
  },
  
  // Get report data
  getReport: async (projectId, reportId) => {
    try {
      const response = await api.get(`/project/${projectId}/report/${reportId}`);
      return response;
    } catch (error) {
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch report data'
        }
      };
    }
  },
  
  // Create a new report
  createReport: async (projectId, reportData) => {
    try {
      const response = await api.post(`/project/${projectId}/create_report`, reportData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Delete a report
  deleteReport: async (projectId, reportId) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/delete`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Edit a report
  editReport: async (projectId, reportId, reportData) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/edit`, reportData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Update report status
  updateReportStatus: async (projectId, reportId, newStatus) => {
    try {
      const response = await api.put(`/project/${projectId}/report/${reportId}/status`, {
        status: newStatus
      });
      return response;
    } catch (error) {
      if (error.response) {
        // Handle specific error cases from backend
        if (error.response.status === 404) {
          throw new Error('Report not found or does not belong to this project');
        }
        if (error.response.status === 400) {
          if (error.response.data.error.includes('Invalid status')) {
            throw new Error('Invalid status value. Status must be Live, In Draft, or Deleted');
          }
          if (error.response.data.error.includes('Cannot set report to Live when project is not Live')) {
            throw new Error('Cannot set report to Live when project is not Live');
          }
          if (error.response.data.error.includes('At least one field must be selected')) {
            throw new Error('At least one field must be selected');
          }
          if (error.response.data.error.includes('At least one report page must be maintained')) {
            throw new Error('At least one report page must be maintained');
          }
        }
        // Return backend error message if available
        throw new Error(error.response.data.error || 'Failed to update report status');
      }
      // Handle network or other errors
      throw new Error('Network error occurred while updating report status');
    }
  },
  
  // Copy a report
  copyReport: async (projectId, reportId, newName, newDescription, targetProjectId = null) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/copy`, {
        name: newName,
        description: newDescription,
        target_project_id: targetProjectId
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default reportService; 