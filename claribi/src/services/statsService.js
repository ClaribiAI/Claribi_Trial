import api from './api';

const CACHE_KEY = 'user_stats_cache';
const CACHE_TIMESTAMP_KEY = 'user_stats_cache_timestamp';

/**
 * Stats service for handling statistics-related API calls
 */
const statsService = {
  /**
   * Get cached stats from localStorage
   * @returns {Object|null} Cached stats data or null
   */
  getCachedStats: () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        // Check if cache is from the same session (page refresh)
        const sessionStart = sessionStorage.getItem('session_start');
        const cacheTime = parseInt(timestamp, 10);
        
        // If we have a session start and cache is older, it's from a previous session
        if (sessionStart && cacheTime < parseInt(sessionStart, 10)) {
          return null; // Cache is from previous session, need to refresh
        }
        
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error reading cached stats:', error);
      return null;
    }
  },

  /**
   * Cache stats to localStorage
   * @param {Object} statsData - Stats data to cache
   */
  cacheStats: (statsData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(statsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error caching stats:', error);
    }
  },

  /**
   * Clear cached stats
   */
  clearCache: () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing stats cache:', error);
    }
  },

  /**
   * Get statistics for the current authenticated user
   * @param {boolean} useCache - Whether to use cached data if available (default: true)
   * @returns {Promise} Response with user statistics
   */
  getUserStats: async (useCache = true) => {
    // Check cache first if enabled
    if (useCache) {
      const cached = statsService.getCachedStats();
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await api.get('/api/stats/user');
      if (response.data && response.data.success) {
        // Cache the response
        statsService.cacheStats(response.data);
      }
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
  },

  /**
   * Get token usage statistics for the current authenticated user
   * @returns {Promise} Response with token usage data
   */
  getUserTokenUsage: async () => {
    try {
      const response = await api.get('/api/stats/user/tokens');
      return response.data;
    } catch (error) {
      console.error('Error fetching user token usage:', error);
      throw error;
    }
  }
};

export default statsService;

