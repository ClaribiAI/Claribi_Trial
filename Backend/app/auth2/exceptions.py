"""
Auth2 Exceptions Module

Custom exceptions for the authentication system.
"""

class Auth2Exception(Exception):
    """Base exception for Auth2 system"""
    pass

class ConfigurationError(Auth2Exception):
    """Raised when authentication configuration is invalid"""
    pass

class AuthenticationError(Auth2Exception):
    """Raised when authentication fails"""
    pass

class TokenError(Auth2Exception):
    """Raised when token operations fail"""
    pass

class SessionError(Auth2Exception):
    """Raised when session operations fail"""
    pass

class GraphAPIError(Auth2Exception):
    """Raised when Microsoft Graph API calls fail"""
    pass

class RateLimitError(Auth2Exception):
    """Raised when rate limits are exceeded"""
    pass 