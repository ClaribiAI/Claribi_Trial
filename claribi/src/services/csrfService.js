/**
 * CSRF Service for Flask-WTF Integration
 * 
 * This service manages CSRF tokens for the React frontend when working with
 * a Flask backend that uses Flask-WTF for CSRF protection.
 */

import api from './api';

class CSRFService {
  constructor() {
    this.csrfToken = null;
    this.tokenPromise = null;
  }

  /**
   * Fetch a fresh CSRF token from the backend
   * @returns {Promise<string|null>} The CSRF token or null if failed
   */
  async fetchToken() {
    // Prevent multiple simultaneous requests for tokens
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this._doFetchToken();
    
    try {
      const token = await this.tokenPromise;
      this.csrfToken = token;
      return token;
    } finally {
      this.tokenPromise = null;
    }
  }

  async _doFetchToken() {
    try {
      console.log('🔄 Fetching CSRF token from /api/auth/csrf-token');
      
      // Use direct fetch call to avoid circular dependency with api interceptor
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include', // Important for session-based CSRF
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('📡 CSRF token response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 CSRF token response data:', { success: data.success, hasToken: !!data.csrf_token });
      
      if (data.success && data.csrf_token) {
        console.log('✅ CSRF token fetched successfully');
        return data.csrf_token;
      } else {
        console.error('❌ Invalid CSRF token response:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch CSRF token:', error);
      return null;
    }
  }

  /**
   * Get the current CSRF token, fetching if necessary
   * @returns {Promise<string|null>}
   */
  async getToken() {
    if (!this.csrfToken) {
      return await this.fetchToken();
    }
    return this.csrfToken;
  }

  /**
   * Clear the stored token (useful when it expires or becomes invalid)
   */
  clearToken() {
    this.csrfToken = null;
    console.log('🔄 CSRF token cleared');
  }

  /**
   * Initialize CSRF protection by fetching the initial token
   * This should be called when the app starts up
   */
  async initialize() {
    console.log('🔧 Initializing CSRF protection...');
    const token = await this.fetchToken();
    if (token) {
      console.log('✅ CSRF protection initialized successfully');
    } else {
      console.warn('⚠️ CSRF protection initialization failed');
    }
    return !!token;
  }

  /**
   * Test CSRF protection by making a simple POST request
   * This is useful for debugging CSRF issues
   */
  async testCSRF() {
    try {
      console.log('🧪 Testing CSRF protection...');
      
      const token = await this.getToken();
      if (!token) {
        console.error('❌ No CSRF token available for test');
        return false;
      }

      console.log('🔑 Using CSRF token for test:', token.substring(0, 8) + '...');

      // Make a test request to a protected endpoint
      const response = await fetch('/api/auth/csrf-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': token,
        },
        body: JSON.stringify({ test: true })
      });

      console.log('📡 CSRF test response status:', response.status);
      
      if (response.ok) {
        console.log('✅ CSRF protection test passed');
        return true;
      } else {
        const data = await response.json().catch(() => ({ error: 'Failed to parse response' }));
        console.error('❌ CSRF protection test failed:', response.status, data);
        return false;
      }
    } catch (error) {
      console.error('❌ CSRF protection test error:', error);
      return false;
    }
  }
}

// Export a singleton instance
export default new CSRFService(); 