"""
Auth2 Middleware Module

Authentication middleware, decorators, and security functions.
"""
import logging
from functools import wraps
from typing import Callable, Any, Optional, Dict
from flask import session, request, jsonify, g
from app.auth2.config import Auth2Config

auth2_config = Auth2Config()

logger = logging.getLogger(__name__)

def auth_required(f: Callable) -> Callable:
    """
    Decorator to require authentication for route access.
    
    Args:
        f: The route function to protect
        
    Returns:
        Wrapped function that checks authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user = get_current_user_from_session()
            if not user:
                logger.warning(f"Unauthorized access attempt to {request.endpoint}")
                return jsonify({
                    "success": False,
                    "error": "unauthorized",
                    "message": "Authentication required"
                }), 401
            
            # Check if organization is still allowed
            from app.auth2.services import UserService
            if not UserService.is_organization_allowed(user.get('organization_id')):
                logger.warning(f"Organization {user.get('organization_id')} is no longer allowed to access the system")
                return jsonify({
                    "success": False,
                    "error": "organization_not_allowed",
                    "message": "Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan."
                }), 403
            
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

def require_roles(*allowed_roles):
    """
    Decorator to require specific roles for route access.
    
    Args:
        allowed_roles: Variable number of role names that are allowed
        
    Returns:
        Decorator function
        
    Example:
        @require_roles('Claribi_Admin', 'Claribi_Developer')
        def admin_only_route():
            pass
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                user = get_current_user_from_session()
                if not user:
                    logger.warning(f"Unauthorized access attempt to {request.endpoint}")
                    return jsonify({
                        "success": False,
                        "error": "unauthorized",
                        "message": "Authentication required"
                    }), 401
                
                user_role = user.get('role')
                if not user_role or user_role not in allowed_roles:
                    logger.warning(f"Access denied for user {user.get('display_id')} with role {user_role} to {request.endpoint}")
                    return jsonify({
                        "success": False,
                        "error": "forbidden",
                        "message": f"Access denied. Required roles: {', '.join(allowed_roles)}"
                    }), 403
                
                # Check if organization is still allowed
                from app.auth2.services import UserService
                if not UserService.is_organization_allowed(user.get('organization_id')):
                    logger.warning(f"Organization {user.get('organization_id')} is no longer allowed to access the system")
                    return jsonify({
                        "success": False,
                        "error": "organization_not_allowed",
                        "message": "Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan."
                    }), 403
                
                # Store user in request context for use in route
                g.current_user = user
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error in require_roles decorator: {e}")
                return jsonify({
                    "success": False,
                    "error": "server_error",
                    "message": "Authorization check failed"
                }), 500
        
        return decorated_function
    return decorator

def optional_auth(f: Callable) -> Callable:
    """
    Decorator that provides user info if authenticated, but doesn't require it.
    
    Args:
        f: The route function
        
    Returns:
        Wrapped function that optionally provides user context
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user = get_current_user_from_session()
            g.current_user = user  # May be None
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Error in optional_auth decorator: {e}")
            g.current_user = None
            return f(*args, **kwargs)
    
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
                
                # Use the advanced rate limiter from auth.middleware
                from app.core.rate_limiter import RateLimiter
                
                # Generate rate limit key for this endpoint
                rate_key = f"auth2:{request.endpoint}"
                
                # Check rate limit using the advanced rate limiter
                allowed, current_count, reset_time = RateLimiter.check_rate_limit(rate_key, limit, window)
                
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

def require_https(f: Callable) -> Callable:
    """
    Decorator to require HTTPS in production.
    
    Args:
        f: The route function to protect
        
    Returns:
        Wrapped function that enforces HTTPS
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Only enforce HTTPS in production
        if (auth2_config.SESSION_COOKIE_SECURE and 
            not request.is_secure and 
            not request.headers.get('X-Forwarded-Proto') == 'https'):
            
            logger.warning(f"HTTPS required for {request.endpoint}")
            return jsonify({
                "success": False,
                "error": "https_required",
                "message": "HTTPS is required for this endpoint"
            }), 400
        
        return f(*args, **kwargs)
    
    return decorated_function



def get_current_user_from_session() -> Optional[Dict[str, Any]]:
    """
    Get current authenticated user directly from session.
    
    Returns:
        User data if authenticated, None otherwise
    """
    try:
        user = session.get("user")
        if not user:
            return None
        
        # Validate user data structure (legacy format)
        if not isinstance(user, dict) or 'ms_object_id' not in user:
            logger.warning("Invalid user data in session")
            return None
        
        return user
    except Exception as e:
        logger.error(f"Error getting user from session: {e}")
        return None


def clear_session() -> None:
    """
    Clear user session securely.
    """
    session.clear()
    session.modified = True

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