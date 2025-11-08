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
  }
};

export default statsService;

