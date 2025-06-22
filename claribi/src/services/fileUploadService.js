import api from './api';

const fileUploadService = {
  // Check if a project/report has data
  checkHasData: async (projectId, reportId) => {
    try {
      const response = await api.get(`/api/project/${projectId}/report/${reportId}/check_data`);
      return response;
    } catch (error) {
      console.error('Error checking data status:', error);
      throw error;
    }
  },
  
  // Check for conflicts in uploaded files
  checkFileConflicts: async (projectId, reportId, files) => {
    try {
      const formData = new FormData();
      
      // Add all files to the form data
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      const response = await api.post(`/api/project/${projectId}/report/${reportId}/check_conflicts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    }
  },
  
  // Upload files for a project/report
  uploadFiles: async (projectId, reportId, files, overwriteTables = null) => {
    try {
      const formData = new FormData();
      
      // Add all files to the form data
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // Add overwrite_tables if provided
      if (overwriteTables) {
        formData.append('overwrite_tables', JSON.stringify(overwriteTables));
      }
      
      const response = await api.post(`/api/project/${projectId}/report/${reportId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }
};

export default fileUploadService; 