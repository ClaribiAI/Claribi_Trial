"""
Microsoft authentication routes.

This module contains all Microsoft AD-related endpoints for authentication.
"""

from flask import redirect, url_for, session, request, current_app, render_template, jsonify, make_response
from app.auth import auth_bp
from app.auth.auth_services import initiate_auth_flow, process_auth_callback, logout_user
from app.auth.auth_common import require_https, save_state, verify_state_fallback
from app.utils import token_utils
from app.utils import error_handlers
import os
import json
import time
import uuid
import traceback
import logging

logger = logging.getLogger(__name__)

@auth_bp.route('/')
@require_https()
def login_page():
    """Render the login page"""
    return render_template('login.html')

@auth_bp.route('/login')
@require_https()
def login():
    """Initiate Microsoft AD login flow"""
    # Store the frontend URL for redirect after auth completion
    frontend_url = request.args.get('redirect_uri', 'https://localhost:5173')
    session['frontend_url'] = frontend_url
    
    # Generate a unique state token directly here
    state = token_utils.generate_uuid_token()
    logger.info(f"Generated new state token: {state}")
    
    # Store in session as a backup
    session['state'] = state
    session.modified = True
    
    # Always save to fallback storage as a reliable source of truth
    save_state(state)
    
    # Create auth URL directly to have full control over the flow
    try:
        from app.auth.auth_services import _get_msal_app, scopes
        msal_app = _get_msal_app()
        auth_url = msal_app.get_authorization_request_url(
            scopes=scopes,
            state=state,
            redirect_uri=current_app.config['MICROSOFT_REDIRECT_URI']
        )
        return redirect(auth_url)
    except Exception as e:
        logger.error(f"ERROR in login: {str(e)}")
        logger.error(traceback.format_exc())
        return redirect(f"{frontend_url}/login?error=Auth+initialization+failed")

@auth_bp.route('/callback')
@require_https()
def auth_callback():
    """Handle the callback from Microsoft AD"""
    # Sanitize sensitive information before logging
    safe_args = {k: '***' if k in ['code', 'id_token', 'access_token'] else v 
                 for k, v in request.args.items()}
    logger.info(f"Auth callback received with sanitized args: {safe_args}")
    
    # Get frontend URL for redirection (default to localhost if not set)
    frontend_url = session.pop('frontend_url', 'https://localhost:5173')
    
    # Get the received state
    received_state = request.args.get('state', '')
    if not received_state:
        logger.error("No state received in callback")
        return redirect(f"{frontend_url}/login?error=Missing+state+parameter")
    
    # Log session state for debugging
    expected_state_session = session.get("state", "NO_STATE_IN_SESSION") 
    logger.info(f"State verification: session_state={expected_state_session}, received={received_state}")
    
    # Always verify with Redis or fallback storage
    if verify_state_fallback(received_state):
        logger.info(f"State verification successful!")
        
        # Ensure session state matches for process_auth_callback
        session['state'] = received_state
        session.modified = True
        
        # Now we're sure the state is valid, process the callback
        from app.auth.auth_services import process_auth_callback
        success, error = process_auth_callback(request.args)
        
        if success:
            # Store user info in session and force session save
            if 'user' in session:
                ms_id = session['user'].get('ms_object_id')
                logger.info(f"User authenticated: {ms_id}")
                
                # Create a secure token for direct verification
                # This completely bypasses cookie/session issues
                auth_token = token_utils.generate_uuid_token()
                
                # Store the token in Redis
                if token_utils.store_auth_token(auth_token, session['user']):
                    logger.info(f"Created direct auth token {auth_token} for user {ms_id}")
                else:
                    logger.warning(f"Could not store token in Redis, falling back to filesystem")
                    # Fallback to filesystem storage
                    token_file_path = os.path.join(os.getcwd(), 'flask_session', f'auth_token_{auth_token}.json')
                    try:
                        with open(token_file_path, 'w') as f:
                            token_data = {
                                'user': session['user'],
                                'created_at': time.time(),
                                'expires_at': time.time() + 300  # 5 minutes expiry
                            }
                            json.dump(token_data, f)
                        logger.info(f"Created direct auth token {auth_token} for user {ms_id} in filesystem")
                    except Exception as e:
                        logger.error(f"Error creating auth token: {e}")
                        return redirect(f"{frontend_url}/login?error=Server+error")
                
                # Check if there's a share token in session
                share_token = session.pop('share_token', None)
                if share_token:
                    # If sharing a project, redirect to that specific URL with the token in a cookie
                    response = make_response(redirect(url_for('projects.access_shared_project', token=share_token)))
                    # Set HTTP-only cookie with the auth token
                    set_auth_cookies(response, auth_token)
                    return response
                
                # Create response with redirect to frontend
                response = make_response(redirect(f"{frontend_url}?auth=success"))
                
                # Set cookies based on environment
                set_auth_cookies(response, auth_token)
                
                # Also add the token as URL parameter for backward compatibility
                # and to handle potential cookie issues in development
                response = make_response(redirect(f"{frontend_url}?auth=success&direct_token={auth_token}"))
                
                # Log session data for debugging
                logger.info(f"Session data before redirect: {dict(session) if 'user' in session else 'No user in session'}")
                
                return response
            else:
                logger.error("Auth successful but no user in session")
                return redirect(f"{frontend_url}/login?error=Session+error")
        else:
            logger.error(f"Authentication failed: {error}")
            # Redirect to frontend with error parameter
            error_msg = error.replace(' ', '+')  # URL encode spaces
            return redirect(f"{frontend_url}/login?error={error_msg}")
    else:
        # State not valid in Redis or fallback storage
        logger.error("State verification failed")
        return redirect(f"{frontend_url}/login?error=Invalid+state+parameter")

def set_auth_cookies(response, auth_token):
    """Set authentication cookies on the response with appropriate security settings"""
    # Check if we're in development or production
    is_production = current_app.config.get('FLASK_ENV') == 'production'
    
    # Set the secure flag based on environment
    secure = True if is_production else False
    
    # Set SameSite policy based on environment
    samesite = 'None' if is_production else 'Lax'
    
    # Set HTTP-only cookie with the auth token
    response.set_cookie(
        'auth_token',
        auth_token,
        max_age=3600,  # 1 hour expiry
        httponly=True,
        secure=secure,
        samesite=samesite
    )
    
    # Set a non-httponly cookie just as a flag for the frontend to know auth succeeded
    # This doesn't contain the actual token
    response.set_cookie(
        'auth_status',
        'success',
        max_age=3600,
        httponly=False,
        secure=secure,
        samesite=samesite
    )
    
    # Set the user ID as a readable cookie for frontend
    ms_id = session.get('user', {}).get('ms_object_id', '')
    if ms_id:
        response.set_cookie(
            'user_id',
            ms_id,
            max_age=3600,
            httponly=False,  # Allow JS to read this
            secure=secure,
            samesite=samesite
        )
    
    return response

@auth_bp.route('/logout')
@require_https()
def logout():
    """Log out the current user"""
    logout_user()
    
    # Create response
    if request.headers.get('Accept') == 'application/json':
        response = jsonify({"success": True})
    else:
        response = redirect('https://localhost:5173/login')
    
    # Clear auth cookies
    is_production = current_app.config.get('FLASK_ENV') == 'production'
    secure = True if is_production else False
    samesite = 'None' if is_production else 'Lax'
    
    response.delete_cookie('auth_token', secure=secure, samesite=samesite)
    response.delete_cookie('auth_status', secure=secure, samesite=samesite)
    response.delete_cookie('user_id', secure=secure, samesite=samesite)
    
    return response 