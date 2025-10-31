"""Security utilities module.

This module provides security-related decorators and utilities for the application.
"""

import time
import functools
from typing import Optional, Callable, Dict, Any
from datetime import datetime
from flask import request, g, abort, current_app, session
import jwt
from app.config.settings import config
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get the current authenticated user from JWT token.
    
    This function delegates to the auth2 module's implementation.
    
    Returns:
        Optional[Dict[str, Any]]: User data if authenticated, None otherwise
    """
    try:
        from app.auth2.middleware import get_current_user_from_token
        user_data = get_current_user_from_token()
        
        if not user_data:
            return None
            
        # Convert auth2 format to expected format for backward compatibility
        return {
            'id': user_data.get('ms_object_id'),  # Use ms_object_id as id
            'ms_object_id': user_data['ms_object_id'],
            'organization_id': user_data.get('organization_id'),
            'display_id': user_data.get('display_id'),
            'is_active': True
        }
            
    except Exception as e:
        logger.error(f"Error getting current user: {e}", exc_info=True)
        return None

def login_required(f: Callable) -> Callable:
    """Decorator to require authentication.
    
    This decorator delegates to the auth2 module's auth_required decorator.
    """
    from app.auth2.middleware import auth_required
    return auth_required(f)


def rate_limit(
    limit: int = 100,
    window: int = 3600,
    key_func: Optional[Callable] = None
) -> Callable:
    """Decorator to apply rate limiting using simple rate limiter.
    
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
            
            # Use simple rate limiter
            from app.core.simple_rate_limiter import get_rate_limiter
            
            limiter = get_rate_limiter()
            allowed, current_count, reset_time = limiter.check_rate_limit(key, limit, window)
            
            # Set rate limit headers
            if hasattr(g, 'rate_limit_headers'):
                g.rate_limit_headers = {
                    'X-RateLimit-Limit': str(limit),
                    'X-RateLimit-Remaining': str(max(0, limit - current_count)),
                    'X-RateLimit-Reset': str(reset_time)
                }
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {key}")
                abort(429)
                
            return f(*args, **kwargs)
        return decorated
    return decorator 

# Security headers are now handled by app.auth2.middleware.SecurityHeaders
# This provides more comprehensive security headers including CSP, stricter frame options, etc. 