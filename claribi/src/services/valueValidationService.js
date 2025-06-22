import api from './api';

const valueValidationService = {
  // Get value validation rules for a report
  getValueRules: async (projectId, reportId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/reports/${reportId}/value_rules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching value rules:', error);
      throw error;
    }
  },

  // Save value validation rules for a report
  saveValueRules: async (projectId, reportId, valueRules) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/reports/${reportId}/value_rules`, {
        value_rules: valueRules
      });
      return response.data;
    } catch (error) {
      console.error('Error saving value rules:', error);
      throw error;
    }
  },

  // Generate validation rules using AI
  generateValueRules: async (projectId, reportId, prompt, fieldName, fieldType, tableName) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/reports/${reportId}/value_rules/generate`, {
        prompt,
        field_name: fieldName,
        field_type: fieldType,
        table_name: tableName
      });
      return response.data;
    } catch (error) {
      console.error('Error generating value rules with AI:', error);
      throw error;
    }
  }
};

export default valueValidationService; 