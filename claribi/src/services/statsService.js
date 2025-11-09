import api from './api';

/**
 * Stats service for handling statistics-related API calls
 */
const statsService = {
  /**
   * Get statistics for the current authenticated user
   * @returns {Promise} Response with user statistics
   */
  getUserStats: async () => {
    try {
      const response = await api.get('/api/stats/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  /**
   * Get statistics breakdown by PBIX file for the current authenticated user
   * @returns {Promise} Response with breakdown data
   */
  getUserStatsBreakdown: async () => {
    try {
      const response = await api.get('/api/stats/user/breakdown');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats breakdown:', error);
      throw error;
    }
  }
};

export default statsService;

