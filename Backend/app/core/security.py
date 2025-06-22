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
from app.database.connection import get_db

logger = get_logger(__name__)

class RateLimiter:
    """Rate limiting implementation using Redis."""
    
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
        current = int(time.time())
        window_key = f"ratelimit:{key}:{current // window}"
        
        try:
            count = self.redis.incr(window_key)
            if count == 1:
                self.redis.expire(window_key, window)
            return count > limit
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False

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
            
        # Decode and validate token
        try:
            payload = jwt.decode(session_token, config.SECRET_KEY, algorithms=['HS256'])
            if not payload or 'ms_object_id' not in payload:
                logger.debug("Invalid token payload")
                return None
                
            return {
                'id': payload.get('id'),
                'ms_object_id': payload['ms_object_id'],
                'organization_id': payload.get('organization_id'),
                'display_id': payload.get('display_id'),
                'is_active': True
            }
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid token: {e}")
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
        
        # Set user in flask.g context
        g.user = user
            
        # Log successful authentication
        logger.debug(f"Authenticated user: {user.get('ms_object_id')}")
            
        return f(*args, **kwargs)
    return decorated

def csrf_protected(f: Callable) -> Callable:
    """Decorator to require CSRF token validation.
    
    This decorator validates the CSRF token for POST/PUT/DELETE requests.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE']:
            token = request.headers.get('X-CSRF-Token')
            if not token or not validate_csrf_token(token):
                logger.warning("Invalid or missing CSRF token")
                abort(403)
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

def secure_headers(app):
    """Add security headers to all responses"""
    @app.after_request
    def add_security_headers(response):
        # Prevent browsers from detecting the mimetype incorrectly
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # Prevent embedding in iframes (clickjacking protection)
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        # Enable browser XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        # Enforce HTTPS - disabled for local development
        # if app.config.get('FORCE_HTTPS', True):
        #     response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response
    
    return add_security_headers 