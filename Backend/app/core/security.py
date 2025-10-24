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