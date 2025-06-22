import api from './api';

const favoritesService = {
  // Groups
  getFavoriteGroups: async () => {
    try {
      const response = await api.get('/api/favorite-groups');
      return response;
    } catch (error) {
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch favorite groups',
          groups: []
        }
      };
    }
  },

  createFavoriteGroup: async (name) => {
    try {
      const response = await api.post('/api/favorite-groups', { name });
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateFavoriteGroup: async (groupId, name) => {
    try {
      const response = await api.put(`/api/favorite-groups/${groupId}`, { name });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update group name');
      }
      return {
        data: {
          success: true,
          data: response.data.data
        }
      };
    } catch (error) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Failed to update group name');
      }
      throw error;
    }
  },

  deleteFavoriteGroup: async (groupId) => {
    try {
      const response = await api.delete(`/api/favorite-groups/${groupId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // URLs
  getGroupUrls: async (groupId) => {
    try {
      const response = await api.get(`/api/favorite-groups/${groupId}/urls`);
      return response;
    } catch (error) {
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to fetch group URLs',
          urls: []
        }
      };
    }
  },

  addUrlToGroup: async (groupId, url, title, filters = null) => {
    try {
      const response = await api.post(`/api/favorite-groups/${groupId}/urls`, {
        url,
        title,
        filters
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteUrl: async (groupId, urlId) => {
    try {
      const response = await api.delete(`/api/favorite-groups/${groupId}/urls/${urlId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default favoritesService; 