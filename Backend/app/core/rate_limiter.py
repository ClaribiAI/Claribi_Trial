"""
Rate Limiter Middleware

This module provides rate limiting functionality to protect routes
from abuse and ensure fair usage of the application.
"""

from flask import request, abort, current_app, g
import time
import logging
import functools
import hashlib
from datetime import datetime
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiting service for API and route protection"""
    
    _redis_client = None
    
    @classmethod
    def _get_redis_client(cls):
        """Get or initialize Redis client for rate limiting"""
        if cls._redis_client is None:
            try:
                host = current_app.config.get('REDIS_HOST', 'localhost')
                port = current_app.config.get('REDIS_PORT', 6379)
                password = current_app.config.get('REDIS_PASSWORD', None)
                db = current_app.config.get('REDIS_RATELIMIT_DB', 0)  # Use default DB for rate limiting
                
                cls._redis_client = redis.Redis(
                    host=host,
                    port=port,
                    password=password,
                    db=db,
                    decode_responses=True
                )
                return cls._redis_client
            except Exception as e:
                logger.error(f"Error connecting to Redis for rate limiting: {str(e)}")
                return None
        return cls._redis_client
    
    @classmethod
    def limit(cls, key=None, limit=60, period=60, by_ip=True, by_user=True):
        """Decorator for rate limiting specific routes
        
        Args:
            key: Custom key prefix for this rate limit
            limit: Maximum number of requests allowed in the period
            period: Time period in seconds
            by_ip: Whether to include client IP in rate limit key
            by_user: Whether to include user ID in rate limit key (if authenticated)
            
        Returns:
            Decorator function for routes
        """
        def decorator(f):
            @functools.wraps(f)
            def wrapper(*args, **kwargs):
                # Skip rate limiting in debug mode if configured
                if current_app.config.get('DISABLE_RATE_LIMIT_IN_DEBUG', False) and current_app.debug:
                    return f(*args, **kwargs)
                
                # Generate rate limit key
                rate_key = cls._generate_rate_key(key or f.__name__, by_ip, by_user)
                
                # Check rate limit
                allowed, current_count, reset_time = cls.check_rate_limit(rate_key, limit, period)
                
                # Set rate limit headers
                response = None
                if hasattr(g, 'rate_limit_headers'):
                    g.rate_limit_headers = {
                        'X-RateLimit-Limit': str(limit),
                        'X-RateLimit-Remaining': str(max(0, limit - current_count)),
                        'X-RateLimit-Reset': str(reset_time)
                    }
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for {rate_key}")
                    abort(429, description="Too many requests")
                
                return f(*args, **kwargs)
            return wrapper
        return decorator
    
    @classmethod
    def check_rate_limit(cls, rate_key, limit, period):
        """Check if a request should be rate limited
        
        Args:
            rate_key: The rate limiting key
            limit: Maximum number of requests
            period: Time period in seconds
            
        Returns:
            tuple: (allowed, current_count, reset_time)
        """
        redis_client = cls._get_redis_client()
        current_time = int(time.time())
        
        # If Redis available, use sliding window for precise rate limiting
        if redis_client:
            try:
                # Clean expired entries first (optional - for large rate limits)
                # pipeline = redis_client.pipeline()
                # pipeline.zremrangebyscore(rate_key, 0, current_time - period)
                
                # Add current request with score as timestamp
                # pipeline.zadd(rate_key, {current_time: current_time})
                # pipeline.expire(rate_key, period)
                # pipeline.zrange(rate_key, 0, -1)
                # results = pipeline.execute()
                
                # Simplified version without pipeline
                redis_client.zremrangebyscore(rate_key, 0, current_time - period)
                redis_client.zadd(rate_key, {str(current_time): current_time})
                redis_client.expire(rate_key, period)
                
                # Get all requests in the current window
                recent_requests = redis_client.zrange(rate_key, 0, -1)
                request_count = len(recent_requests)
                
                # Calculate reset time
                if request_count > 0 and request_count >= limit:
                    oldest_request = int(recent_requests[0])
                    reset_time = oldest_request + period
                else:
                    reset_time = current_time + period
                
                return request_count < limit, request_count, reset_time
            except Exception as e:
                logger.error(f"Redis error during rate limiting: {str(e)}")
                # Default to allowing the request if Redis errors
                return True, 0, current_time + period
        
        # Fallback to memory-based rate limiting (less accurate)
        # This is a very basic implementation - in production, use Redis
        if not hasattr(cls, '_memory_rate_limits'):
            cls._memory_rate_limits = {}
        
        # Clean expired entries
        cls._memory_rate_limits = {
            k: v for k, v in cls._memory_rate_limits.items() 
            if v['timestamp'] + period > current_time
        }
        
        # Check current limit
        if rate_key not in cls._memory_rate_limits:
            cls._memory_rate_limits[rate_key] = {
                'count': 1,
                'timestamp': current_time
            }
            return True, 1, current_time + period
        else:
            cls._memory_rate_limits[rate_key]['count'] += 1
            count = cls._memory_rate_limits[rate_key]['count']
            reset_time = cls._memory_rate_limits[rate_key]['timestamp'] + period
            return count <= limit, count, reset_time
    
    @staticmethod
    def _generate_rate_key(prefix, by_ip, by_user):
        """Generate a unique key for rate limiting
        
        Args:
            prefix: Key prefix (usually function name)
            by_ip: Whether to include client IP
            by_user: Whether to include user ID
            
        Returns:
            str: Rate limiting key
        """
        key_parts = [prefix]
        
        # Add client IP if requested
        if by_ip:
            # Get client IP with proxy handling
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if client_ip:
                # Anonymize the last octet
                if '.' in client_ip:
                    parts = client_ip.split('.')
                    anonymized_ip = '.'.join(parts[:-1]) + '.0'
                else:
                    # IPv6 address
                    anonymized_ip = client_ip
                key_parts.append(anonymized_ip)
        
        # Add user ID if authenticated and requested
        if by_user and hasattr(g, 'user') and g.user:
            key_parts.append(str(g.user.get('id') or g.user.get('ms_object_id', 'anonymous')))
        
        # Join parts and create a hash
        key = "rate:{}".format(':'.join(key_parts))
        
        return key

def rate_limit_headers(app):
    """Add rate limit headers to all responses
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def add_rate_limit_headers(response):
        if hasattr(g, 'rate_limit_headers') and g.rate_limit_headers:
            for key, value in g.rate_limit_headers.items():
                response.headers.add(key, value)
        return response
    
    return add_rate_limit_headers

# Convenience decorators for common rate limits
def global_rate_limit(f=None, limit=1000, period=3600):
    """Global rate limit across all users (mainly for anonymous access)"""
    if f is None:
        return functools.partial(global_rate_limit, limit=limit, period=period)
    return RateLimiter.limit(key="global", limit=limit, period=period, by_ip=True, by_user=False)(f)

def user_rate_limit(f=None, limit=100, period=60):
    """Per-user rate limit, useful for authenticated API routes"""
    if f is None:
        return functools.partial(user_rate_limit, limit=limit, period=period)
    return RateLimiter.limit(key="user", limit=limit, period=period, by_ip=False, by_user=True)(f)

def strict_rate_limit(f=None, limit=10, period=60):
    """Strict rate limit using both IP and user ID"""
    if f is None:
        return functools.partial(strict_rate_limit, limit=limit, period=period)
    return RateLimiter.limit(key="strict", limit=limit, period=period, by_ip=True, by_user=True)(f)