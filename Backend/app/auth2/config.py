"""
Auth2 Configuration Module

Centralized configuration for the new authentication system.
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Auth2Config:
    """Configuration class for Auth2 system"""
    
    # MSAL Configuration with fallbacks to legacy MICROSOFT_* variables
    MSAL_CLIENT_ID = os.environ.get('MSAL_CLIENT_ID') or os.environ.get('MICROSOFT_CLIENT_ID')
    MSAL_CLIENT_SECRET = os.environ.get('MSAL_CLIENT_SECRET') or os.environ.get('MICROSOFT_CLIENT_SECRET')
    MSAL_TENANT_ID = os.environ.get('MSAL_TENANT_ID') or os.environ.get('MICROSOFT_TENANT_ID')
    MSAL_REDIRECT_PATH = "/api/auth/callback"
    # Graph API scopes - includes User.Read 
    MSAL_SCOPES = ["User.Read"]
    
    @property
    def MSAL_AUTHORITY(self):
        """Dynamically construct MSAL authority URL"""
        tenant_id = self.MSAL_TENANT_ID
        if not tenant_id:
            raise ValueError("MSAL_TENANT_ID or MICROSOFT_TENANT_ID must be set")
        return f"https://login.microsoftonline.com/{tenant_id}"
    
    # Security Settings
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://localhost:5173')
    ALLOWED_LOGIN_REDIRECTS = os.environ.get(
        'ALLOWED_LOGIN_REDIRECTS', 
        FRONTEND_URL
    ).split(',')
    
    # Session Configuration
    SESSION_LIFETIME = int(os.environ.get('PERMANENT_SESSION_LIFETIME', 3600))  # 1 hour default
    SESSION_COOKIE_SECURE = True  # Required for SameSite=None
    # Use 'None' for cross-origin requests (requires Secure=True)
    SESSION_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_DOMAIN = None  # Let Flask handle domain automatically
    
    # Rate Limiting
    LOGIN_RATE_LIMIT = "5 per minute"
    CALLBACK_RATE_LIMIT = "10 per minute"
    REFRESH_RATE_LIMIT = "20 per minute"  # Higher limit for refresh as it's called frequently
    
    # State Parameter Validation
    # Time window for state parameter validation (in seconds)
    # Reduced from 10 minutes to 5 minutes for better security
    STATE_VALIDATION_WINDOW = int(os.environ.get('AUTH2_STATE_VALIDATION_WINDOW', 300))  # 5 minutes default
    

    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate that all required configuration values are present"""
        required_vars = [
            'MSAL_CLIENT_ID',
            'MSAL_CLIENT_SECRET', 
            'MSAL_TENANT_ID'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Create global config instance
auth2_config = Auth2Config() 