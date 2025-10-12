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
    # Standard scopes - roles come from ID token claims, not API calls
    MSAL_SCOPES = ["User.Read"]
    
    # Valid app roles for the application
    VALID_APP_ROLES = ["Claribi_Admin", "Claribi_User", "Claribi_Developer"]
    
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
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV', 'development') == 'production'
    # Use 'Lax' for better compatibility with cross-origin requests
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN')
    
    # Rate Limiting
    LOGIN_RATE_LIMIT = "5 per minute"
    CALLBACK_RATE_LIMIT = "10 per minute"
    

    
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