import api from './api';

/**
 * Fetch query analytics data
 * @param {Object} options Optional parameters
 * @param {Date} options.startDate Optional start date for the analytics range
 * @param {Date} options.endDate Optional end date for the analytics range
 * @returns {Promise<Object>} Analytics data containing total queries and hours saved
 */
export const getQueryAnalytics = async (options = {}) => {
    try {
        const { startDate, endDate } = options;
        let url = '/analytics/queries';

        // Add date range parameters if provided
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const response = await api.get('/analytics/queries');
        
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch analytics');
        }

        return response.data.analytics;
    } catch (error) {
        console.error('Error fetching query analytics:', error);
        throw error;
    }
}; 