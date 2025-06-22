"""
Common utility functions for authentication.

This module contains shared utility functions and decorators used by all auth route modules.
"""

from flask import request, redirect, current_app
from functools import wraps
from app.utils import token_utils
import os
import json
import time
import logging

logger = logging.getLogger(__name__)

# Path to temporary state storage for fallback
STATE_STORAGE_PATH = os.path.join(os.getcwd(), 'flask_session', 'auth_states.json')

def save_state(state, expiry=300):
    """Save state using Redis with filesystem fallback"""
    # First try to save with token_utils (Redis)
    if token_utils.store_state_token(state, expiry):
        logger.info(f"Saved state {state} to Redis")
        return True
        
    # Fallback to file storage
    try:
        data = {}
        if os.path.exists(STATE_STORAGE_PATH):
            with open(STATE_STORAGE_PATH, 'r') as f:
                data = json.load(f)
        
        # Clean expired states
        now = time.time()
        data = {k: v for k, v in data.items() if v > now}
        
        # Add new state with expiry time
        data[state] = now + expiry
        
        with open(STATE_STORAGE_PATH, 'w') as f:
            json.dump(data, f)
            
        logger.info(f"Saved state {state} to fallback storage")
        return True
    except Exception as e:
        logger.error(f"Error saving state to file: {e}")
        return False

def verify_state_fallback(state):
    """Verify state using Redis with filesystem fallback"""
    if not state:
        return False
        
    # First try to verify with token_utils (Redis)
    if token_utils.verify_state_token(state):
        logger.info(f"Verified state {state} from Redis")
        return True
        
    # Fallback to file storage
    try:
        if not os.path.exists(STATE_STORAGE_PATH):
            return False
            
        with open(STATE_STORAGE_PATH, 'r') as f:
            data = json.load(f)
        
        # Check if state exists and is not expired
        now = time.time()
        is_valid = state in data and data[state] > now
        
        # Clean up if valid
        if is_valid:
            data.pop(state, None)
            with open(STATE_STORAGE_PATH, 'w') as f:
                json.dump(data, f)
            logger.info(f"Verified state {state} from fallback storage")
            
        return is_valid
    except Exception as e:
        logger.error(f"Error checking state in fallback: {e}")
        return False

def require_https():
    """Decorator to enforce HTTPS, respects X-Forwarded-Proto and allows HTTP in debug"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto', 'http') == 'https'
            if not is_secure and not current_app.debug:
                return redirect(request.url.replace('http://', 'https://', 1))
            return f(*args, **kwargs)
        return decorated_function
    return decorator 