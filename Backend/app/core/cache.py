"""Cache Module

This module provides caching functionality using Redis with security measures.
"""

import json
import hashlib
import hmac
from typing import Any, Optional, Union
from redis import Redis
from app.config.settings import config
from app.core.logging import get_logger
from flask import current_app

logger = get_logger(__name__)

# Initialize Redis client as None
_redis_client = None

def get_redis() -> Redis:
    """Get Redis client instance with secure connection.
    
    Returns:
        Redis: Redis client
        
    Raises:
        Exception: If Redis connection fails
    """
    global _redis_client
    
    if not _redis_client:
        try:
            # Configure Redis client
            redis_config = {
                'host': config.REDIS_HOST,
                'port': config.REDIS_PORT,
                'password': config.REDIS_PASSWORD,
                'decode_responses': True,
            }
            
            # Only use SSL in production
            is_development = current_app.config.get('ENV') == 'development'
            if not is_development and config.REDIS_SSL:
                redis_config.update({
                    'ssl': True,
                    'ssl_cert_reqs': 'required'
                })
            
            _redis_client = Redis(**redis_config)
            # Test connection
            _redis_client.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
            
    return _redis_client

# Alias for backward compatibility
get_redis_client = get_redis

class Cache:
    """Cache implementation using Redis with security measures."""
    
    @staticmethod
    def _secure_key(prefix: str, *args) -> str:
        """Generate secure cache key with HMAC.
        
        Args:
            prefix: Key prefix
            *args: Additional key parts
            
        Returns:
            str: Secure cache key
        """
        # Create base key
        base_key = f"{prefix}:{':'.join(str(arg) for arg in args)}"
        
        # Add HMAC for key verification
        key_hmac = hmac.new(
            config.SECRET_KEY.encode(),
            base_key.encode(),
            hashlib.sha256
        ).hexdigest()[:16]  # Use first 16 chars of HMAC
        
        # Combine with HMAC
        return f"{base_key}:{key_hmac}"
    
    @staticmethod
    def key(prefix: str, *args) -> str:
        """Generate secure cache key.
        
        Args:
            prefix: Key prefix
            *args: Additional key parts
            
        Returns:
            str: Cache key
        """
        return Cache._secure_key(prefix, *args)
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache with key verification.
        
        Args:
            key: Cache key
            
        Returns:
            Any: Cached value or None if not found
        """
        try:
            # Verify key HMAC
            parts = key.split(':')
            if len(parts) < 2:
                logger.warning(f"Invalid cache key format: {key}")
                return None
                
            hmac_part = parts[-1]
            base_key = ':'.join(parts[:-1])
            
            expected_key = Cache._secure_key(*parts[:-1])
            if key != expected_key:
                logger.warning(f"Cache key verification failed: {key}")
                return None
            
            # Get and decrypt data
            data = get_redis().get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {str(e)}")
            return None
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with max size limit.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 5 minutes)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Verify key format
            if ':' not in key:
                logger.warning(f"Invalid cache key format: {key}")
                return False
            
            # Check value size (limit to 1MB)
            serialized = json.dumps(value)
            if len(serialized) > 1024 * 1024:  # 1MB
                logger.warning(f"Cache value too large for key {key}")
                return False
            
            return get_redis().setex(
                key,
                ttl,
                serialized
            )
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {str(e)}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete value from cache with key verification.
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Verify key HMAC before deletion
            parts = key.split(':')
            if len(parts) < 2:
                logger.warning(f"Invalid cache key format: {key}")
                return False
                
            expected_key = Cache._secure_key(*parts[:-1])
            if key != expected_key:
                logger.warning(f"Cache key verification failed: {key}")
                return False
            
            return bool(get_redis().delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {str(e)}")
            return False
    
    @staticmethod
    def delete_pattern(pattern: str) -> bool:
        """Delete all keys matching pattern with verification.
        
        Args:
            pattern: Key pattern to match
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            redis = get_redis()
            keys = redis.keys(pattern)
            
            # Verify each key before deletion
            valid_keys = []
            for key in keys:
                parts = key.split(':')
                if len(parts) >= 2:
                    expected_key = Cache._secure_key(*parts[:-1])
                    if key == expected_key:
                        valid_keys.append(key)
                    else:
                        logger.warning(f"Cache key verification failed: {key}")
            
            if valid_keys:
                return bool(redis.delete(*valid_keys))
            return True
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {str(e)}")
            return False

# Create a singleton instance of Cache
cache = Cache() 