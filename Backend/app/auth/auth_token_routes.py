"""
Token-related authentication routes.

This module contains all token-related endpoints for authentication.
"""

from flask import jsonify, session, request, current_app, make_response
from app.auth import auth_bp
from app.auth.auth_common import require_https
from app.utils import token_utils
from app.utils import error_handlers
import os
import json
import time
import threading
import logging

logger = logging.getLogger(__name__)

@auth_bp.route('/verify-token', methods=['GET'])
@require_https()
def verify_token_from_cookie():
    """Verify a direct authentication token from HTTP-only cookie"""
    # Get token from cookie
    token = request.cookies.get('auth_token')
    
    if not token:
        logger.error("No auth token cookie found")
        return error_handlers.handle_authentication_error("No authentication token found")
    
    return _verify_token(token)
    
@auth_bp.route('/verify-token/<token>')
@require_https()
def verify_token(token):
    """Verify a direct authentication token from URL parameter (legacy support)"""
    if not token:
        logger.error("No token provided for verification")
        return error_handlers.handle_validation_error("No token provided")
    
    return _verify_token(token)

def _verify_token(token):
    """Internal function to verify a token regardless of source"""
    # First try to verify with token_utils (Redis)
    success, user_data, already_used = token_utils.verify_auth_token(token)
    
    if success:
        # Token is valid in Redis
        logger.info(f"Token verified for user: {user_data.get('ms_object_id')}")
        
        # Store user data in session
        session['user'] = user_data
        session.modified = True
        session.permanent = True
        
        # Return success with user data
        return jsonify({
            "success": True,
            "data": user_data,
            "already_used": already_used,
            "source": "redis"
        })
    
    # If Redis verification failed, fallback to filesystem verification
    token_file_path = os.path.join(os.getcwd(), 'flask_session', f'auth_token_{token}.json')
    
    # Check if the token file exists
    if not os.path.exists(token_file_path):
        logger.error(f"Token not found in Redis or filesystem: {token}")
        return error_handlers.handle_authentication_error("Invalid token")
    
    try:
        # Read the token data
        with open(token_file_path, 'r') as f:
            token_data = json.load(f)
        
        # Check if the token has already been used
        if token_data.get('used', False):
            logger.info(f"Token already used but still valid: {token}")
            # Token already used but still valid, return success without recreating session
            return jsonify({
                "success": True,
                "data": token_data.get('user'),
                "already_used": True,
                "source": "filesystem"
            })
        
        # Check if the token has expired
        if token_data.get('expires_at', 0) < time.time():
            # Token expired, delete the file
            try:
                os.remove(token_file_path)
            except:
                pass
            
            logger.error(f"Token expired: {token}")
            return error_handlers.handle_authentication_error("Token expired")
        
        # Token is valid, recreate the session
        user_data = token_data.get('user')
        if not user_data:
            logger.error(f"Token has no user data: {token}")
            return error_handlers.handle_validation_error("Invalid token data")
        
        # Store user data in session
        session['user'] = user_data
        session.modified = True
        session.permanent = True
        
        # Mark the token as used but don't delete it yet
        # This allows for duplicate requests with the same token
        token_data['used'] = True
        with open(token_file_path, 'w') as f:
            json.dump(token_data, f)
        
        # Schedule deletion of the token file after a delay
        # This gives time for any duplicate requests to complete
        def delete_token_file():
            try:
                time.sleep(20)  # Wait 20 seconds
                if os.path.exists(token_file_path):
                    os.remove(token_file_path)
                    logger.info(f"Deleted used token file: {token}")
            except Exception as e:
                logger.warning(f"Failed to delete token file: {e}")
        
        # Start a background thread to delete the file
        delete_thread = threading.Thread(target=delete_token_file)
        delete_thread.daemon = True
        delete_thread.start()
        
        logger.info(f"Token verified successfully from filesystem for user: {user_data.get('ms_object_id')}")
        
        # Return success with user data
        return jsonify({
            "success": True,
            "data": user_data,
            "source": "filesystem"
        })
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        return error_handlers.handle_unexpected_error(e, "Token verification error")

@auth_bp.route('/health-check')
def health_check():
    """Simple health check endpoint to verify the backend is running"""
    return jsonify({
        "status": "ok",
        "message": "Backend server is running"
    }) 