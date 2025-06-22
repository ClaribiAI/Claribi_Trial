"""
Authentication State Storage Module

This module provides Redis-based storage for authentication state tokens
to replace the filesystem-based storage.
"""

from datetime import datetime, timedelta
from flask import current_app
import time
import json
import threading
from app.utils import redis_utils
from app.utils import token_utils
from app.utils import error_handlers
import logging

logger = logging.getLogger(__name__)

# How often to run token cleanup (in seconds)
CLEANUP_INTERVAL = 3600  # Run cleanup once per hour

class RedisStateStorage:
    """Redis-based storage for authentication state tokens"""
    
    _instance = None
    _cleanup_thread = None
    
    @classmethod
    def get_instance(cls):
        """Get or create singleton instance with proper application context"""
        if cls._instance is None:
            cls._instance = cls()
            
        return cls._instance
    
    def __init__(self):
        """Initialize instance"""
        pass
    
    def _get_state_key(self, state):
        """Get Redis key for state token"""
        return f"auth:state:{state}"
    
    def save_state(self, state, expiry=300):
        """Save state token to Redis
        
        Args:
            state (str): The state token to save
            expiry (int): Expiration time in seconds (default: 300 seconds / 5 minutes)
        """
        return token_utils.store_state_token(state, expiry)
    
    def verify_state(self, state):
        """Verify if state token exists and is valid
        
        Args:
            state (str): The state token to verify
            
        Returns:
            bool: True if state is valid, False otherwise
        """
        return token_utils.verify_state_token(state)
            
class RedisAuthTokenStorage:
    """Redis-based storage for authentication direct tokens"""
    
    _instance = None
    _cleanup_thread = None
    
    @classmethod
    def get_instance(cls):
        """Get or create singleton instance with proper application context"""
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._start_cleanup_thread()
            
        return cls._instance
    
    def __init__(self):
        """Initialize instance"""
        pass
    
    def _start_cleanup_thread(self):
        """Start a background thread to clean up used tokens"""
        if self._cleanup_thread is None:
            self._cleanup_thread = threading.Thread(target=self._token_cleanup_task, daemon=True)
            self._cleanup_thread.start()
            logger.info("Started Redis token cleanup thread")
    
    def _token_cleanup_task(self):
        """Background task to clean up used and expired tokens"""
        while True:
            try:
                time.sleep(CLEANUP_INTERVAL)
                cleaned = token_utils.cleanup_used_tokens(older_than_seconds=300)
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} used tokens from scheduled task")
            except Exception as e:
                logger.error(f"Error in token cleanup thread: {e}")
    
    def store_token(self, token, user_data, expiry=300):
        """Store direct authentication token with user data
        
        Args:
            token (str): The direct token
            user_data (dict): User data to store with token
            expiry (int): Expiration time in seconds (default: 300 seconds / 5 minutes)
        
        Returns:
            bool: True if token was stored successfully, False otherwise
        """
        return token_utils.store_auth_token(token, user_data, expiry)
    
    def verify_token(self, token):
        """Verify direct token and get associated user data
        
        Args:
            token (str): The direct token to verify
            
        Returns:
            tuple: (success, user_data or error, already_used)
                success (bool): True if token is valid
                user_data (dict) or error (str): User data if valid, error message otherwise
                already_used (bool): True if token was already used
        """
        return token_utils.verify_auth_token(token) 