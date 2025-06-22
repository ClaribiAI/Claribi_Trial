import api from './api';

const reportConfigService = {
  // Get report configuration data
  getReportConfig: async (projectId, reportId) => {
    try {
      const response = await api.get(`/project/${projectId}/report/${reportId}/config`);
      return response;
    } catch (error) {
      // Return a structured error response
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch report configuration'
        }
      };
    }
  },
  
  // Save field selections for a report
  saveFieldSelections: async (projectId, reportId, selectedFields) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/fields`, {
        selected_fields: selectedFields
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Save synonyms for a report
  saveSynonyms: async (projectId, reportId, synonymsData) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/synonyms`, {
        synonyms: synonymsData
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Save report URL
  saveReportUrl: async (projectId, reportId, url) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/url`, {
        url: url
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Save a report page
  saveReportPage: async (projectId, reportId, pageData) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/page`, pageData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Get report pages
  getReportPages: async (projectId, reportId) => {
    try {
      const response = await api.get(`/project/${projectId}/report/${reportId}/pages`);
      return response;
    } catch (error) {
      // Return a structured error response
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch report pages',
          pages: []
        }
      };
    }
  },
  
  // Delete a report page
  deleteReportPage: async (projectId, reportId, pageId) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/page/${pageId}/delete`);
      return response;
    } catch (error) {
      console.error('Error deleting report page:', error);
      throw error;
    }
  },
  
  // Delete a table from a report
  deleteTable: async (projectId, reportId, tableName) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/reports/${reportId}/delete-table`, {
        table_name: tableName
      });
      return response;
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  },
  
  // Edit a report page
  editReportPage: async (projectId, reportId, pageId, pageData) => {
    try {
      const response = await api.put(`/project/${projectId}/report/${reportId}/page/${pageId}/edit`, pageData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Get value rules for a field
  getValueRules: async (projectId, reportId, fieldKey) => {
    try {
      const response = await api.get(`/project/${projectId}/report/${reportId}/value-rules/${fieldKey}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Save value rules for a field
  saveValueRules: async (projectId, reportId, fieldKey, rules) => {
    try {
      const response = await api.post(`/project/${projectId}/report/${reportId}/value-rules/${fieldKey}`, {
        rules: rules
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default reportConfigService; 