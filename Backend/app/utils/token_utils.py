"""
Token Utilities Module

This module provides utilities for token generation and verification.
"""

from flask import current_app, request
import secrets
import uuid
import json
import time
import hashlib
import logging
from app.utils import redis_utils

logger = logging.getLogger(__name__)

# Constants for token types
TOKEN_TYPE_AUTH = 'auth'
TOKEN_TYPE_STATE = 'state'
TOKEN_TYPE_SHARE = 'share'

def generate_token(length=32):
    """Generate a secure random token
    
    Args:
        length (int): Length of the token in bytes
        
    Returns:
        str: A URL-safe token string
    """
    return secrets.token_urlsafe(length)

def generate_uuid_token():
    """Generate a UUID-based token
    
    Returns:
        str: A UUID string
    """
    return str(uuid.uuid4())

def store_auth_token(token, user_data, expiry=300):
    """Store an authentication token with user data
    
    Args:
        token (str): The token to store
        user_data (dict): User data to associate with the token
        expiry (int): Expiration time in seconds
        
    Returns:
        bool: True if token was stored successfully
    """
    try:
        # Create token data
        token_data = {
            "user": user_data,
            "created_at": time.time(),
            "expires_at": time.time() + expiry,
            "used": False
        }
        
        # Store in Redis
        key = f"auth:direct_token:{token}"
        return redis_utils.set_with_expiry(
            key,
            json.dumps(token_data),
            expiry
        )
    except Exception as e:
        logger.error(f"Error storing auth token: {str(e)}")
        return False

def verify_auth_token(token):
    """Verify an authentication token and get associated user data
    
    Args:
        token (str): The token to verify
        
    Returns:
        tuple: (success, user_data or error, already_used)
            success (bool): True if token is valid
            user_data (dict) or error (str): User data if valid, error message otherwise
            already_used (bool): True if token was already used
    """
    if not token:
        return False, "Invalid token", False
        
    try:
        # Get token data from Redis
        key = f"auth:direct_token:{token}"
        token_data_str = redis_utils.get_value(key)
        
        if not token_data_str:
            logger.error(f"Direct token {token} not found")
            return False, "Token not found", False
            
        # Parse token data
        token_data = json.loads(token_data_str)
        
        # Check if token has expired
        if token_data.get("expires_at", 0) < time.time():
            # Delete expired token
            redis_utils.delete_key(key)
            logger.error(f"Direct token {token} has expired")
            return False, "Token expired", False
        
        # Check if token was already used
        already_used = token_data.get("used", False)
        
        # Mark token as used
        token_data["used"] = True
        redis_utils.set_with_expiry(
            key,
            json.dumps(token_data),
            int(token_data.get("expires_at", time.time() + 300) - time.time())
        )
        
        # Return user data
        return True, token_data.get("user", {}), already_used
    except Exception as e:
        logger.error(f"Error verifying direct token: {str(e)}")
        return False, f"Error verifying token: {str(e)}", False

def store_state_token(state, expiry=300):
    """Store a state token for CSRF protection
    
    Args:
        state (str): The state token to store
        expiry (int): Expiration time in seconds
        
    Returns:
        bool: True if successful
    """
    try:
        # Create state data
        state_data = {
            "created_at": time.time(),
            "expires_at": time.time() + expiry
        }
        
        # Store in Redis
        key = f"auth:state:{state}"
        return redis_utils.set_with_expiry(
            key,
            json.dumps(state_data),
            expiry
        )
    except Exception as e:
        logger.error(f"Error storing state token: {str(e)}")
        return False

def verify_state_token(state):
    """Verify a state token for CSRF protection
    
    Args:
        state (str): The state token to verify
        
    Returns:
        bool: True if valid
    """
    if not state:
        return False
        
    try:
        # Get state data from Redis
        key = f"auth:state:{state}"
        state_data_str = redis_utils.get_value(key)
        
        if not state_data_str:
            logger.debug(f"State token {state} not found")
            return False
            
        # Parse state data
        state_data = json.loads(state_data_str)
        
        # Check if still valid
        is_valid = state_data.get("expires_at", 0) > time.time()
        
        # If valid, delete to prevent reuse
        if is_valid:
            redis_utils.delete_key(key)
            logger.info(f"State token {state} verified and deleted")
            
        return is_valid
    except Exception as e:
        logger.error(f"Error verifying state token: {str(e)}")
        return False

def create_token_fingerprint(token_data=None):
    """Create a unique fingerprint for token validation
    
    Args:
        token_data (dict): Optional data to include in fingerprint
        
    Returns:
        str: A hash fingerprint
    """
    # Get user agent and timestamp for fingerprinting
    user_agent = request.user_agent.string if request and hasattr(request, 'user_agent') else "unknown"
    timestamp = str(time.time())
    client_ip = request.remote_addr if request else "unknown"
    
    # Add some random data for additional security
    salt = secrets.token_hex(8)
    
    # Combine all data
    fingerprint_data = f"{user_agent}|{timestamp}|{client_ip}|{salt}"
    
    # Add token data if provided
    if token_data:
        fingerprint_data += f"|{json.dumps(token_data)}"
        
    # Create fingerprint hash
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()

def cleanup_used_tokens(older_than_seconds=300, batch_size=100):
    """Clean up tokens that have been used and are older than specified time
    
    Args:
        older_than_seconds (int): Only clean tokens older than this many seconds
        batch_size (int): Maximum number of tokens to clean in one batch
        
    Returns:
        int: Number of tokens cleaned up
    """
    try:
        # Get client with scan support
        client = redis_utils.get_redis_client()
        if not client:
            return 0
            
        # Get current time
        now = time.time()
        cleaned = 0
        
        # Scan for tokens matching the pattern
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor, match="auth:direct_token:*", count=batch_size)
            
            for key in keys:
                try:
                    # Get token data
                    token_data_str = client.get(key)
                    if not token_data_str:
                        continue
                        
                    token_data = json.loads(token_data_str)
                    
                    # If token is used and older than specified time, delete it
                    if (token_data.get('used', False) and 
                        token_data.get('created_at', now) < (now - older_than_seconds)):
                        client.delete(key)
                        cleaned += 1
                except Exception as e:
                    logger.error(f"Error cleaning up token {key}: {e}")
            
            # If we've completed the scan, break
            if cursor == 0:
                break
                
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} used tokens")
            
        return cleaned
    except Exception as e:
        logger.error(f"Error in token cleanup: {e}")
        return 0 