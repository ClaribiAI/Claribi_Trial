"""
Redis Utilities Module

This module provides shared Redis connection logic and utilities for the application.
"""

from flask import current_app
from redis import Redis, ConnectionPool
import logging

logger = logging.getLogger(__name__)

# Global connection pools for different Redis use cases
_connection_pools = {}

def get_redis_client(db=0, decode_responses=False, connection_name="default"):
    """Get a Redis client with connection pooling
    
    Args:
        db (int): Redis database number (default: 0)
        decode_responses (bool): Whether to decode Redis responses to unicode strings (default: False)
        connection_name (str): A name for this connection type to reuse the same pool
        
    Returns:
        Redis: A Redis client instance or None if connection fails
    """
    global _connection_pools
    
    # Create unique pool key for this connection configuration
    pool_key = f"{connection_name}:{db}:{decode_responses}"
    
    try:
        # Get existing pool or create a new one
        if pool_key not in _connection_pools:
            # Get Redis configuration from app config
            host = current_app.config.get('REDIS_HOST', 'localhost')
            port = current_app.config.get('REDIS_PORT', 6379)
            password = current_app.config.get('REDIS_PASSWORD', None)
            ssl_enabled = current_app.config.get('REDIS_SSL', False)
            
            # Create connection pool
            pool_kwargs = {
                'host': host,
                'port': port,
                'password': password,
                'db': db,
                'decode_responses': decode_responses,
                'max_connections': 10
            }
            
            # Add SSL configuration if enabled
            if ssl_enabled:
                cert_reqs = current_app.config.get('REDIS_SSL_CERT_REQS', 'required')
                pool_kwargs['ssl'] = True
                pool_kwargs['ssl_cert_reqs'] = cert_reqs
                
            _connection_pools[pool_key] = ConnectionPool(**pool_kwargs)
            logger.info(f"Created Redis connection pool: {pool_key}")
            
        # Create and return Redis client with the connection pool
        client = Redis(connection_pool=_connection_pools[pool_key])
        
        # Test connection by pinging Redis server
        client.ping()
        logger.debug(f"Redis connection successful for {pool_key}")
        return client
        
    except Exception as e:
        logger.error(f"Redis connection error for {pool_key}: {str(e)}")
        return None

def set_with_expiry(key, value, expiry_seconds, client=None):
    """Set a value in Redis with expiration
    
    Args:
        key (str): Redis key
        value (str): Value to store
        expiry_seconds (int): Expiration time in seconds
        client (Redis): Optional Redis client (will create one if not provided)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get client if not provided
        redis_client = client or get_redis_client()
        if not redis_client:
            return False
            
        # Set with expiry
        redis_client.set(key, value, ex=expiry_seconds)
        return True
    except Exception as e:
        logger.error(f"Error setting Redis key {key}: {str(e)}")
        return False

def get_value(key, client=None):
    """Get a value from Redis
    
    Args:
        key (str): Redis key
        client (Redis): Optional Redis client (will create one if not provided)
        
    Returns:
        str: Value or None if key doesn't exist or error occurs
    """
    try:
        # Get client if not provided
        redis_client = client or get_redis_client()
        if not redis_client:
            return None
            
        # Get value
        return redis_client.get(key)
    except Exception as e:
        logger.error(f"Error getting Redis key {key}: {str(e)}")
        return None

def delete_key(key, client=None):
    """Delete a key from Redis
    
    Args:
        key (str): Redis key
        client (Redis): Optional Redis client (will create one if not provided)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get client if not provided
        redis_client = client or get_redis_client()
        if not redis_client:
            return False
            
        # Delete key
        redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Error deleting Redis key {key}: {str(e)}")
        return False

def key_exists(key, client=None):
    """Check if a key exists in Redis
    
    Args:
        key (str): Redis key
        client (Redis): Optional Redis client (will create one if not provided)
        
    Returns:
        bool: True if key exists, False otherwise
    """
    try:
        # Get client if not provided
        redis_client = client or get_redis_client()
        if not redis_client:
            return False
            
        # Check if key exists
        return redis_client.exists(key) > 0
    except Exception as e:
        logger.error(f"Error checking Redis key {key}: {str(e)}")
        return False 