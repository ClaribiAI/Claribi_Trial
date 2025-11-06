/**
 * Settings utility functions for managing user preferences
 */

/**
 * Get chat mode preference from localStorage
 * @returns {string} 'detailed' or 'concise', defaults to 'detailed'
 */
export const getChatMode = () => {
    try {
      const savedMode = localStorage.getItem('chatMode');
      return savedMode === 'concise' ? 'concise' : 'detailed';
    } catch (error) {
      console.error('Error getting chat mode:', error);
      return 'detailed';
    }
  };
  
  /**
   * Set chat mode preference in localStorage
   * @param {string} mode - 'detailed' or 'concise'
   */
  export const setChatMode = (mode) => {
    try {
      if (mode === 'detailed' || mode === 'concise') {
        localStorage.setItem('chatMode', mode);
      } else {
        console.warn('Invalid chat mode:', mode);
      }
    } catch (error) {
      console.error('Error setting chat mode:', error);
    }
  };
  
  /**
   * Get cookie preferences from localStorage
   * @returns {object} Object with cookie preferences
   */
  export const getCookiePreferences = () => {
    try {
      const saved = localStorage.getItem('cookiePreferences');
      if (saved) {
        return JSON.parse(saved);
      }
      // Default preferences
      return {
        necessary: true, // Always true, cannot be disabled
        analytics: false,
        marketing: false,
      };
    } catch (error) {
      console.error('Error getting cookie preferences:', error);
      return {
        necessary: true,
        analytics: false,
        marketing: false,
      };
    }
  };
  
  /**
   * Set cookie preferences in localStorage
   * @param {object} preferences - Object with cookie preferences
   */
  export const setCookiePreferences = (preferences) => {
    try {
      // Ensure necessary cookies are always enabled
      const prefs = {
        ...preferences,
        necessary: true,
      };
      localStorage.setItem('cookiePreferences', JSON.stringify(prefs));
    } catch (error) {
      console.error('Error setting cookie preferences:', error);
    }
  };
  
  /**
   * Delete all user data from localStorage and sessionStorage
   * Note: This should be called carefully, especially regarding auth tokens
   * @param {boolean} keepAuth - Whether to keep auth token (default: false)
   */
  export const deleteAllData = (keepAuth = false) => {
    try {
      const authToken = keepAuth ? localStorage.getItem('jwt_token') : null;
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Restore auth token if requested
      if (keepAuth && authToken) {
        localStorage.setItem('jwt_token', authToken);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting all data:', error);
      return false;
    }
  };