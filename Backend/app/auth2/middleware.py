"""
Auth2 Middleware Module

Authentication middleware, decorators, and security functions.
"""
import logging
from functools import wraps
from typing import Callable, Any, Optional, Dict
from flask import request, jsonify, g
from app.auth2.config import Auth2Config
from app.auth2.jwt_service import JWTService

auth2_config = Auth2Config()

logger = logging.getLogger(__name__)

def auth_required(f: Callable) -> Callable:
    """
    Decorator to require JWT authentication for route access.
    
    Args:
        f: The route function to protect
        
    Returns:
        Wrapped function that checks JWT authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                logger.warning(f"No token provided for {request.endpoint}")
                return jsonify({
                    "success": False,
                    "error": "unauthorized",
                    "message": "Authentication required"
                }), 401
            
            token = auth_header.split(' ')[1]
            
            # Validate JWT token
            user = JWTService.validate_user_token(token)
            if not user:
                logger.warning(f"Invalid token for {request.endpoint}")
                return jsonify({
                    "success": False,
                    "error": "unauthorized",
                    "message": "Invalid or expired token"
                }), 401
            
            
            # Store user in request context for use in route
            g.current_user = user
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Error in auth_required decorator: {e}")
            return jsonify({
                "success": False,
                "error": "server_error",
                "message": "Authentication check failed"
            }), 500
    
    return decorated_function


def rate_limit(limit_string: str):
    """
    Decorator for rate limiting endpoints.
    
    Args:
        limit_string: Rate limit specification (e.g., "5 per minute", "100 per hour")
        
    Returns:
        Decorator function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Parse limit_string (e.g., "5 per minute" -> limit=5, window=60)
            try:
                parts = limit_string.split()
                if len(parts) != 3 or parts[1] != 'per':
                    logger.error(f"Invalid rate limit format: {limit_string}")
                    return f(*args, **kwargs)
                
                limit = int(parts[0])
                unit = parts[2].lower()
                
                # Convert time unit to seconds
                unit_seconds = {
                    'second': 1, 'seconds': 1,
                    'minute': 60, 'minutes': 60,
                    'hour': 3600, 'hours': 3600,
                    'day': 86400, 'days': 86400
                }
                
                window = unit_seconds.get(unit)
                if not window:
                    logger.error(f"Invalid time unit in rate limit: {unit}")
                    return f(*args, **kwargs)
                
                # Use the simplified rate limiter
                from app.core.simple_rate_limiter import get_rate_limiter
                
                # Generate rate limit key for this endpoint
                rate_key = f"auth2:{request.endpoint}"
                
                # Check rate limit using the simplified rate limiter
                limiter = get_rate_limiter()
                allowed, current_count, reset_time = limiter.check_rate_limit(rate_key, limit, window)
                
                # Set rate limit headers in response context
                g.rate_limit_headers = {
                    'X-RateLimit-Limit': str(limit),
                    'X-RateLimit-Remaining': str(max(0, limit - current_count)),
                    'X-RateLimit-Reset': str(reset_time)
                }
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for {rate_key}: {limit_string}")
                    return jsonify({
                        "success": False,
                        "error": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded. Maximum {limit_string} allowed.",
                        "retry_after": reset_time - int(__import__('time').time())
                    }), 429
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error in rate limiting: {e}")
                # If rate limiting fails, allow the request to proceed
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def get_current_user_from_token() -> Optional[Dict[str, Any]]:
    """
    Get current authenticated user from JWT token in Authorization header.
    
    Returns:
        User data if authenticated, None otherwise
    """
    try:
        # Get JWT token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # Validate JWT token
        user = JWTService.validate_user_token(token)
        if not user:
            return None
        
        return user
    except Exception as e:
        logger.error(f"Error getting user from token: {e}")
        return None

def clear_session() -> None:
    """
    Clear user session securely.
    
    Note: For JWT-only authentication, Flask sessions are not used.
    This function is kept for API compatibility and consistency with
    the logout flow. It currently does nothing but may be extended in the
    future if session-based features are added.
    
    The actual logout process is handled by:
    - Clearing the refresh_token cookie (done in routes.logout)
    - Redirecting to Microsoft logout endpoint
    - Frontend clears the JWT access token from localStorage
    """
    # JWT-only authentication doesn't use Flask sessions
    # This function is kept for API compatibility and future extensibility
    pass

class SecurityHeaders:
    """Class for managing security headers"""
    
    @staticmethod
    def apply_security_headers(response):
        """
        Apply security headers to response.
        
        Args:
            response: Flask response object
            
        Returns:
            Modified response with security headers
        """
        # Content Security Policy
        # Note: 'unsafe-inline' and 'unsafe-eval' are required for React/Vite applications:
        # - Vite injects inline scripts during development and build
        # - React and Material-UI inject inline styles
        # - Some third-party libraries require eval for dynamic code generation
        # For production, consider implementing nonces or hashes if possible
        # (requires build-time CSP injection or SSR)
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; "
            "frame-ancestors 'none';"
        )
        
        # Other security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # HSTS in production
        if auth2_config.SESSION_COOKIE_SECURE:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response 