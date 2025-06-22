"""
Session management routes.

This module contains all session-related endpoints for authentication.
"""

from flask import jsonify, session, request, make_response
from app.auth import auth_bp
from app.auth.auth_services import get_user_info
from app.auth.auth_common import require_https
from app.database.connection import get_db
from app.utils import error_handlers
from app.core.security import generate_csrf_token
import os
import json
import time
import logging

logger = logging.getLogger(__name__)

@auth_bp.route('/profile')
@require_https()
def profile():
    """Return user profile information as JSON"""
    # Check if user is authenticated
    if 'user' not in session:
        return error_handlers.handle_authentication_error("Not authenticated")
    
    # Check if we have all required user data
    user_info = get_user_info()
    if not user_info or 'ms_object_id' not in user_info:
        return error_handlers.handle_authentication_error("Incomplete user data")
    
    # Return complete user info
    return jsonify({
        "success": True,
        "data": user_info
    })

@auth_bp.route('/verify-auth')
@require_https()
def verify_auth():
    """Verify that the user is authenticated after redirect from login callback"""
    # Check if user is authenticated via session
    if 'user' in session:
        user_info = get_user_info()
        
        return jsonify({
            "success": True,
            "data": user_info
        })
    
    # If not in session, check for backup auth cookie
    auth_backup = request.cookies.get('auth_backup')
    if auth_backup:
        # First try to find a backup file
        session_file_path = os.path.join(os.getcwd(), 'flask_session', f'session_token_{auth_backup}.json')
        if os.path.exists(session_file_path):
            try:
                # Read the session data from the backup file
                with open(session_file_path, 'r') as f:
                    session_data = json.load(f)
                
                # Check if the session data is still valid
                if session_data.get('expires', 0) > time.time():
                    # Restore the session from the backup
                    session['user'] = session_data['user']
                    session.modified = True
                    
                    # Clean up the backup file
                    try:
                        os.remove(session_file_path)
                    except:
                        pass
                    
                    return jsonify({
                        "success": True,
                        "data": session_data['user'],
                        "restored": True,
                        "source": "file"
                    })
            except Exception as e:
                pass
        
        # If no valid backup file, try to get from database
        try:
            # Get user from database using the ID in the cookie
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, ms_object_id, organization_id, display_id FROM users WHERE ms_object_id = %s",
                (auth_backup,)
            )
            user_data = cursor.fetchone()
            
            if user_data:
                # Restore user session
                user_info = {
                    'id': user_data[0],
                    'ms_object_id': user_data[1],
                    'organization_id': user_data[2],
                    'display_id': user_data[3]
                }
                
                # Store back in session
                session['user'] = user_info
                session.modified = True
                session.permanent = True
                
                return jsonify({
                    "success": True,
                    "data": user_info,
                    "restored": True,
                    "source": "database"
                })
        except Exception as e:
            pass
    
    # If all fails, user is not authenticated
    return error_handlers.handle_authentication_error("Not authenticated")

@auth_bp.route('/session-check')
@require_https()
def session_check():
    """Check if the user is authenticated and the session is valid"""
    if 'user' in session:
        ms_id = session['user'].get('ms_object_id', 'unknown')
        return jsonify({
            "success": True,
            "message": "Session is valid",
            "user_id": ms_id
        })
    else:
        return error_handlers.handle_authentication_error("Not authenticated", {"message": "Not authenticated"})

@auth_bp.route('/debug')
def debug_auth():
    """Debug endpoint to help troubleshoot session and cookie issues"""
    # Get all cookies
    cookies = {key: request.cookies.get(key) for key in request.cookies.keys()}
    
    # Get session data
    session_data = dict(session) if session else {}
    
    # Check if specific auth cookies exist
    has_auth_token = 'auth_token' in request.cookies
    has_auth_status = 'auth_status' in request.cookies
    has_user_in_session = 'user' in session
    
    # Get request headers
    headers = {key: value for key, value in request.headers.items()}
    
    return jsonify({
        "cookies": cookies,
        "session": session_data,
        "auth_checks": {
            "has_auth_token": has_auth_token,
            "has_auth_status": has_auth_status,
            "has_user_in_session": has_user_in_session
        },
        "headers": headers,
        "remote_addr": request.remote_addr,
        "timestamp": time.time()
    })

@auth_bp.route('/csrf-token')
@require_https()
def get_csrf_token():
    """Get a new CSRF token."""
    if 'user' not in session:
        return error_handlers.handle_authentication_error("Not authenticated")
        
    token = generate_csrf_token()
    response = make_response(jsonify({
        'success': True,
        'csrf_token': token
    }))
    response.set_cookie('csrf_token', token, secure=True, httponly=False, samesite='None')
    return response 