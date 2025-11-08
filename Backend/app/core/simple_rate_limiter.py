"""
Simplified In-Memory Rate Limiter

This module provides rate limiting functionality using in-memory storage
instead of Redis, making it suitable for JWT-based authentication.
"""

from flask import request, abort, current_app, g
import time
import logging
import functools
import hashlib
from datetime import datetime
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class SimpleRateLimiter:
    """In-memory rate limiting service for API and route protection"""
    
    def __init__(self):
        """Initialize rate limiter with in-memory storage"""
        self._local_cache = defaultdict(lambda: deque())
        self._cleanup_interval = 300  # Clean up every 5 minutes
        self._last_cleanup = time.time()
    
    def _cleanup_expired_entries(self):
        """Clean up expired entries from the cache"""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = current_time
        for key in list(self._local_cache.keys()):
            # Remove entries older than 1 hour
            while self._local_cache[key] and self._local_cache[key][0] < current_time - 3600:
                self._local_cache[key].popleft()
            
            # Remove empty keys
            if not self._local_cache[key]:
                del self._local_cache[key]
    
    def _get_rate_key(self, key=None, by_ip=True, by_user=True):
        """Generate a unique key for rate limiting"""
        components = []
        
        if by_ip:
            components.append(f"ip:{request.remote_addr}")
        
        if by_user:
            # Try to get user ID from JWT token or session
            user_id = None
            try:
                from flask import g
                if hasattr(g, 'current_user') and g.current_user:
                    user_id = g.current_user.get('ms_object_id')
            except:
                pass
            
            if user_id:
                components.append(f"user:{user_id}")
        
        if key:
            components.append(f"key:{key}")
        
        return ":".join(components)
    
    def check_rate_limit(self, key, limit, window):
        """
        Check if a request should be rate limited.
        
        Args:
            key: Rate limiting key
            limit: Maximum number of requests
            window: Time window in seconds
            
        Returns:
            Tuple of (allowed, current_count, reset_time)
        """
        self._cleanup_expired_entries()
        
        current_time = time.time()
        rate_key = self._get_rate_key(key)
        
        # Get current requests for this key
        requests = self._local_cache[rate_key]
        
        # Remove requests outside the window
        cutoff_time = current_time - window
        while requests and requests[0] < cutoff_time:
            requests.popleft()
        
        # Check if we're over the limit
        current_count = len(requests)
        if current_count >= limit:
            reset_time = requests[0] + window if requests else current_time + window
            return False, current_count, reset_time
        
        # Add current request
        requests.append(current_time)
        
        reset_time = requests[0] + window if requests else current_time + window
        return True, current_count + 1, reset_time
    
    @classmethod
    def limit(cls, key=None, limit=60, period=60, by_ip=True, by_user=True):
        """
        Decorator for rate limiting routes.
        
        Args:
            key: Custom key for rate limiting
            limit: Maximum number of requests
            period: Time period in seconds
            by_ip: Whether to rate limit by IP address
            by_user: Whether to rate limit by user ID
        """
        def decorator(f):
            @functools.wraps(f)
            def decorated_function(*args, **kwargs):
                # Get rate limiter instance
                limiter = getattr(current_app, '_rate_limiter', None)
                if limiter is None:
                    limiter = SimpleRateLimiter()
                    current_app._rate_limiter = limiter
                
                # Check rate limit
                allowed, current_count, reset_time = limiter.check_rate_limit(
                    key, limit, period
                )
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for {key}: {current_count}/{limit}")
                    abort(429)
                
                # Add rate limit headers
                response = f(*args, **kwargs)
                if hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(limit)
                    response.headers['X-RateLimit-Remaining'] = str(limit - current_count)
                    response.headers['X-RateLimit-Reset'] = str(int(reset_time))
                
                return response
            
            return decorated_function
        return decorator

# Global rate limiter instance
_rate_limiter = SimpleRateLimiter()

def get_rate_limiter():
    """Get the global rate limiter instance"""
    return _rate_limiter

def rate_limit_by_ip(limit=60, period=60):
    """Rate limit by IP address only"""
    return SimpleRateLimiter.limit(key="global", limit=limit, period=period, by_ip=True, by_user=False)

def rate_limit_by_user(limit=60, period=60):
    """Rate limit by user ID only"""
    return SimpleRateLimiter.limit(key="user", limit=limit, period=period, by_ip=False, by_user=True)

def rate_limit_strict(limit=60, period=60):
    """Rate limit by both IP and user ID"""
    return SimpleRateLimiter.limit(key="strict", limit=limit, period=period, by_ip=True, by_user=True)

def rate_limit_headers(app):
    """Add rate limit headers to all responses"""
    @app.after_request
    def add_rate_limit_headers(response):
        from flask import g
        
        # Check if rate limit headers were set by rate limiting middleware
        if hasattr(g, 'rate_limit_headers') and g.rate_limit_headers:
            # Use actual rate limit values from middleware
            response.headers['X-RateLimit-Limit'] = g.rate_limit_headers.get('X-RateLimit-Limit', '60')
            response.headers['X-RateLimit-Remaining'] = g.rate_limit_headers.get('X-RateLimit-Remaining', '60')
            response.headers['X-RateLimit-Reset'] = g.rate_limit_headers.get('X-RateLimit-Reset', str(int(time.time() + 60)))
        else:
            # Add default rate limit headers if not already present
            if 'X-RateLimit-Limit' not in response.headers:
                response.headers['X-RateLimit-Limit'] = '60'
            if 'X-RateLimit-Remaining' not in response.headers:
                response.headers['X-RateLimit-Remaining'] = '60'
            if 'X-RateLimit-Reset' not in response.headers:
                response.headers['X-RateLimit-Reset'] = str(int(time.time() + 60))
        
        return response
