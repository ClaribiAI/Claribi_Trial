// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL || 'https://api.production-url.com'
  : 'https://localhost:5000';

// Other configuration constants can be added here as needed 