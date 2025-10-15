"""Security utilities module.

This module provides security-related decorators and utilities for the application.
"""

import time
import functools
from typing import Optional, Callable, Dict, Any
from datetime import datetime
from flask import request, g, abort, current_app, session
import jwt
from redis import Redis
from app.core.cache import get_redis
from app.config.settings import config
from app.core.logging import get_logger

logger = get_logger(__name__)

class RateLimiter:
    """Rate limiting implementation - now uses advanced rate limiter as backend."""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        
    def is_rate_limited(self, key: str, limit: int, window: int) -> bool:
        """Check if request should be rate limited.
        
        Args:
            key: Rate limit key (e.g. IP or user ID)
            limit: Maximum requests allowed
            window: Time window in seconds
            
        Returns:
            bool: True if should be rate limited
        """
        try:
            # Use the advanced rate limiter for better accuracy and reliability
            from app.core.rate_limiter import RateLimiter as AdvancedRateLimiter
            
            # Check rate limit using advanced implementation
            allowed, current_count, reset_time = AdvancedRateLimiter.check_rate_limit(key, limit, window)
            
            # Set rate limit headers if available
            if hasattr(g, 'rate_limit_headers'):
                g.rate_limit_headers = {
                    'X-RateLimit-Limit': str(limit),
                    'X-RateLimit-Remaining': str(max(0, limit - current_count)),
                    'X-RateLimit-Reset': str(reset_time)
                }
            
            return not allowed  # Advanced returns allowed=True/False, we return limited=True/False
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False  # Allow request if rate limiting fails

def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance."""
    return RateLimiter(get_redis())

def generate_csrf_token() -> str:
    """Generate a new CSRF token."""
    return jwt.encode(
        {'timestamp': datetime.utcnow().isoformat()},
        config.SECRET_KEY,
        algorithm='HS256'
    )

def validate_csrf_token(token: str) -> bool:
    """Validate CSRF token.
    
    Args:
        token: CSRF token to validate
        
    Returns:
        bool: True if token is valid
    """
    try:
        jwt.decode(token, config.SECRET_KEY, algorithms=['HS256'])
        return True
    except jwt.InvalidTokenError:
        return False

def get_current_user() -> Optional[Dict[str, Any]]:
    """Get the current authenticated user from session.
    
    Returns:
        Optional[Dict[str, Any]]: User data if authenticated, None otherwise
    """
    try:
        # First check session for Microsoft auth user data
        if 'user' in session:
            user_data = session['user']
            if isinstance(user_data, dict) and 'ms_object_id' in user_data:
                return {
                    'id': user_data.get('id'),
                    'ms_object_id': user_data['ms_object_id'],
                    'organization_id': user_data.get('organization_id'),
                    'display_id': user_data.get('display_id'),
                    'is_active': True  # Microsoft authenticated users are considered active
                }
        
        # Fallback to token-based auth
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_token:
            logger.debug("No auth token found in headers")
            return None
            
        # Use JWT service for proper token validation
        try:
            from app.auth2.jwt_service import JWTService
            user_data = JWTService.validate_user_token(session_token)
            if not user_data:
                logger.debug("Invalid or expired token")
                return None
                
            return {
                'id': user_data.get('ms_object_id'),  # Use ms_object_id as id
                'ms_object_id': user_data['ms_object_id'],
                'organization_id': user_data.get('organization_id'),
                'display_id': user_data.get('display_id'),
                'is_active': True
            }
        except Exception as e:
            logger.debug(f"Error validating token: {e}")
            return None
            
    except Exception as e:
        logger.error(f"Error getting current user: {e}", exc_info=True)
        return None

def login_required(f: Callable) -> Callable:
    """Decorator to require authentication.
    
    This decorator checks for a valid session and user authentication
    before allowing access to the endpoint.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        # Get and set current user
        user = get_current_user()
        if not user:
            logger.warning("Unauthenticated access attempt")
            abort(401)
        
        # Check if organization is allowed
        from app.auth2.services import UserService
        if not UserService.is_organization_allowed(user.get('organization_id')):
            logger.warning(f"Organization {user.get('organization_id')} is not allowed to access the system")
            abort(403, description="Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan.")
        
        # Set user in flask.g context
        g.user = user
            
        # Log successful authentication
        logger.debug(f"Authenticated user: {user.get('ms_object_id')}")
            
        return f(*args, **kwargs)
    return decorated

def csrf_protected(f: Callable) -> Callable:
    """Decorator to require CSRF token validation using Flask-WTF.
    
    This decorator validates the CSRF token for POST/PUT/DELETE/PATCH requests.
    Flask-WTF automatically handles CSRF validation, so this decorator is now
    a pass-through that relies on Flask-WTF's built-in protection.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        # Flask-WTF automatically validates CSRF tokens for state-changing requests
        # No additional validation needed here as Flask-WTF handles it globally
        return f(*args, **kwargs)
    return decorated

def rate_limit(
    limit: int = 100,
    window: int = 3600,
    key_func: Optional[Callable] = None
) -> Callable:
    """Decorator to apply rate limiting.
    
    Args:
        limit: Maximum requests allowed in window
        window: Time window in seconds
        key_func: Optional function to generate rate limit key
    """
    def decorator(f: Callable) -> Callable:
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            # Get rate limit key
            if key_func:
                key = key_func()
            else:
                key = request.remote_addr
                
            # Check rate limit
            if get_rate_limiter().is_rate_limited(key, limit, window):
                logger.warning(f"Rate limit exceeded for {key}")
                abort(429)
                
            return f(*args, **kwargs)
        return decorated
    return decorator 

# Security headers are now handled by app.auth2.middleware.SecurityHeaders
# This provides more comprehensive security headers including CSP, stricter frame options, etc. 