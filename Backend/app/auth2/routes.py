"""
Auth2 Routes Module

Updated authentication routes with improved security and structure.
"""
import logging
from flask import jsonify, session, request, redirect
from flask_wtf.csrf import generate_csrf
from app.auth2 import auth2_bp
from app.auth2.config import Auth2Config

auth2_config = Auth2Config()
from app.auth2.services import MSALService, UserService, GraphService
from app.auth2.middleware import auth_required, rate_limit, get_current_user_from_session, clear_session, require_roles

logger = logging.getLogger(__name__)

# --- Helper Functions ---

def validate_redirect_uri(redirect_uri: str) -> str:
    """Validate and sanitize redirect URI"""
    if not redirect_uri:
        return auth2_config.ALLOWED_LOGIN_REDIRECTS[0]
    
    try:
        from urllib.parse import urlparse
        parsed_uri = urlparse(redirect_uri)
        if not parsed_uri.scheme or not parsed_uri.netloc:
            logger.warning(f"Invalid redirect_uri format: {redirect_uri}")
            return auth2_config.ALLOWED_LOGIN_REDIRECTS[0]
        
        normalized_uri_netloc = parsed_uri.netloc.lower()
        for allowed_url in auth2_config.ALLOWED_LOGIN_REDIRECTS:
            if urlparse(allowed_url).netloc.lower() == normalized_uri_netloc:
                return redirect_uri
        
        logger.warning(f"Redirect URI not in allowlist: {redirect_uri}")
        return auth2_config.ALLOWED_LOGIN_REDIRECTS[0]
        
    except Exception as e:
        logger.error(f"Error validating redirect URI {redirect_uri}: {e}")
        return auth2_config.ALLOWED_LOGIN_REDIRECTS[0]

# --- Authentication Flow Routes ---

@auth2_bp.route("/login")
@rate_limit(auth2_config.LOGIN_RATE_LIMIT)
def login():
    """
    Initiate Microsoft authentication flow.
    Accepts optional redirect_uri parameter for post-login redirection.
    """
    try:
        # Get and validate redirect URI
        frontend_redirect_uri = request.args.get('redirect_uri', auth2_config.ALLOWED_LOGIN_REDIRECTS[0])
        validated_redirect = validate_redirect_uri(frontend_redirect_uri)
        session['post_login_redirect'] = validated_redirect
        
        # Initiate MSAL auth flow
        auth_flow = MSALService.initiate_auth_flow()
        session["auth_flow"] = auth_flow
        session.modified = True
        
        # Also store the redirect URI in the state parameter as backup
        import json
        import base64
        state_data = {
            'redirect_uri': validated_redirect,
            'timestamp': int(__import__('time').time())
        }
        # Store state data in session as backup
        session['auth_state_data'] = state_data
        
        return redirect(auth_flow["auth_uri"])
        
    except Exception as e:
        logger.error(f"Error initiating login: {e}")
        return jsonify({
            "success": False, 
            "error": "login_failed",
            "message": "Failed to initiate login process"
        }), 500

@auth2_bp.route("/callback")
@rate_limit(auth2_config.CALLBACK_RATE_LIMIT)
def callback():
    """
    Handle Microsoft authentication callback.
    Processes the authorization code and establishes user session.
    """
    try:

        # Get auth flow from session
        auth_flow = session.pop("auth_flow", {})
        if not auth_flow:
            # Try to recover from state data
            state_data = session.get('auth_state_data', {})
            fallback_redirect = state_data.get('redirect_uri') or session.get('post_login_redirect', auth2_config.ALLOWED_LOGIN_REDIRECTS[0])
            
            logger.warning(f"No auth flow found in session")
            logger.warning(f"Available session keys: {list(session.keys())}")
            logger.warning(f"State data: {state_data}")
            logger.warning(f"Fallback redirect: {fallback_redirect}")
            
            # Try to create a new auth flow if we have the necessary data
            try:
                # We can't recreate the exact flow, but we can try to process the callback directly
                # This is a fallback - let's try to process the token without the cached flow
                result = MSALService.acquire_token_by_auth_code({}, request.args)
                if "error" not in result:
                    # Continue with the normal processing
                    auth_flow = {}  # Empty flow to continue processing
                else:
                    logger.error(f"Fallback token acquisition failed: {result.get('error')}")
                    return redirect(f"{fallback_redirect}?error=session_lost")
            except Exception as e:
                logger.error(f"Fallback auth flow recreation failed: {e}")
                return redirect(f"{fallback_redirect}?error=session_lost")
        
        # Acquire token using authorization code
        result = MSALService.acquire_token_by_auth_code(auth_flow, request.args)
        
        if "error" in result:
            error_msg = result.get('error_description', 'Authentication failed')
            logger.error(f"Authentication error: {result.get('error')} - {error_msg}")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=authentication_failed")
        
        # Extract user information from ID token
        id_token_claims = result.get("id_token_claims")
        if not id_token_claims:
            logger.error("No ID token claims found")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=missing_claims")
        
        # Get required user identifiers
        ms_object_id = id_token_claims.get("oid")
        organization_id = id_token_claims.get("tid") 
        display_id = id_token_claims.get("preferred_username") or id_token_claims.get("email")
        
        if not ms_object_id or not organization_id:
            logger.error("Missing required user identifiers")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=missing_identifiers")
        
        # Check if organization is allowed
        if not UserService.is_organization_allowed(organization_id):
            logger.warning(f"Organization {organization_id} is not allowed to access the system")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=organization_not_allowed")
        
        # Extract app roles from ID token claims (no API call needed)
        from app.auth2.services import SecurityService
        user_app_roles = SecurityService.extract_app_roles_from_token(id_token_claims)
        
        # Validate that user has at least one valid app role
        if not user_app_roles:
            logger.warning(f"User {display_id} has no valid app roles assigned")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=no_app_role")
        
        # Use the first valid role (in a real scenario, you might want more sophisticated role selection)
        user_role = user_app_roles[0]
        logger.info(f"User {display_id} authenticated with role: {user_role}")
        
        # Create or update user in database with role information
        db_success, db_error = UserService.create_or_update_user(
            ms_object_id, organization_id, display_id, user_role
        )
        if not db_success:
            logger.error(f"Database error: {db_error}")
            return redirect(f"{session.get('post_login_redirect', '/')}?error=database_error")
        
        # Store user info in session using legacy-compatible format
        session.clear()  # Clear any existing session data first
        session["user"] = {
            "ms_object_id": ms_object_id,
            "organization_id": organization_id,
            "display_id": display_id,
            "role": user_role
        }
        session.permanent = True
        session.modified = True
        
        # Force session save by accessing it
        _ = session["user"]
        
        # Get post-login redirect
        state_data = session.get('auth_state_data', {})
        post_login_redirect = session.pop('post_login_redirect', None) or state_data.get('redirect_uri', auth2_config.ALLOWED_LOGIN_REDIRECTS[0])
        
        # Clean up state data
        session.pop('auth_state_data', None)
        
        # Add auth=success parameter to trigger frontend verification
        separator = '&' if '?' in post_login_redirect else '?'
        final_redirect_url = f"{post_login_redirect}{separator}auth=success"
        
        return redirect(final_redirect_url)
        
    except ValueError as e:
        logger.error(f"Invalid request to callback endpoint: {e}")
        return redirect(f"{session.get('post_login_redirect', '/')}?error=invalid_request")
    except Exception as e:
        logger.error(f"Unexpected error in callback: {e}")
        return redirect(f"{session.get('post_login_redirect', '/')}?error=server_error")

@auth2_bp.route("/organization-not-allowed")
def organization_not_allowed():
    """
    Handle organization not allowed error.
    Returns a JSON response with the error message.
    """
    return jsonify({
        "success": False,
        "error": "organization_not_allowed",
        "message": "Your organization has not yet purchased a plan. Please visit www.claribi.ai to purchase a plan."
    }), 403

@auth2_bp.route("/logout")
def logout():
    """
    Log out user and redirect to Microsoft logout.
    Clears session and redirects to Microsoft's logout endpoint.
    """
    try:
        # Clear user session
        clear_session()
        
        # Construct Microsoft logout URL - redirect to login page for better UX
        frontend_login_url = f"{auth2_config.FRONTEND_URL}/login"
        logout_uri = f"{auth2_config.MSAL_AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri={frontend_login_url}"
        
        return redirect(logout_uri)
        
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        # On error, redirect to login page instead of root
        return redirect(f"{auth2_config.FRONTEND_URL}/login")

# --- Protected API Routes ---

@auth2_bp.route("/profile")
@auth_required
def profile():
    """
    Get authenticated user's profile information.
    Primary endpoint for frontend to check active session.
    """
    try:
        user = get_current_user_from_session()
        if not user:
            return jsonify({
                "success": False, 
                "error": "unauthorized",
                "message": "User is not authenticated"
            }), 401
        
        return jsonify({
            "success": True, 
            "data": user
        })
        
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return jsonify({
            "success": False,
            "error": "server_error", 
            "message": "Failed to retrieve profile"
        }), 500

@auth2_bp.route("/session-check")
def session_check():
    """
    Lightweight endpoint to verify user session exists.
    Returns basic session status without full user data.
    """
    try:
        user = get_current_user_from_session()
        if user:
            return jsonify({
                "success": True,
                "message": "Session is valid",
                "user_id": user.get('ms_object_id', 'unknown')
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Not authenticated"
            }), 401
            
    except Exception as e:
        logger.error(f"Error checking session: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to check session"
        }), 500

@auth2_bp.route("/verify-auth")
def verify_auth():
    """
    Verify authentication after redirect from login callback.
    This endpoint is used by the frontend to bootstrap session after login.
    """
    try:
        user = get_current_user_from_session()
        if user:
            return jsonify({
                "success": True,
                "data": user,
                "source": "session"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Not authenticated"
            }), 401
            
    except Exception as e:
        logger.error(f"Error in verify-auth: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to verify authentication"
        }), 500

@auth2_bp.route("/user-role")
@auth_required
def get_user_role():
    """
    Get the current user's role information.
    This endpoint can be used by the frontend for role-based UI rendering.
    """
    try:
        user = get_current_user_from_session()
        if not user:
            return jsonify({
                "success": False,
                "error": "unauthorized",
                "message": "User is not authenticated"
            }), 401
        
        role = user.get('role')
        return jsonify({
            "success": True,
            "data": {
                "role": role,
                "permissions": {
                    "can_modify_status": role in ['Claribi_Admin', 'Claribi_Developer'],
                    "can_access_admin_features": role == 'Claribi_Admin',
                    "can_develop": role == 'Claribi_Developer'
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting user role: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to retrieve user role"
        }), 500

@auth2_bp.route("/graph-data")
@auth_required
def get_graph_data():
    """
    Get user data from Microsoft Graph API.
    Requires valid authentication and Graph API permissions.
    """
    try:
        user = get_current_user_from_session()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Try to acquire access token silently
        result = MSALService.acquire_token_silent()
        if not result or "access_token" not in result:
            return jsonify({
                "error": "token_acquisition_failed",
                "message": "Could not acquire access token. Please log in again."
            }), 401
        
        # Call Microsoft Graph API
        access_token = result['access_token']
        graph_data = GraphService.get_user_profile(access_token)
        
        if not graph_data:
            return jsonify({
                "error": "graph_api_failed",
                "message": "Failed to retrieve data from Graph API"
            }), 502
        
        return jsonify(graph_data)
        
    except Exception as e:
        logger.error(f"Error getting Graph data: {e}")
        return jsonify({
            "error": "server_error",
            "message": "An error occurred while fetching data"
        }), 500

# --- Legacy Compatibility Routes ---

@auth2_bp.route("/csrf-token")
def get_csrf_token():
    """
    Generate and return a CSRF token using Flask-WTF.
    This endpoint is accessible to both authenticated and unauthenticated users
    since CSRF protection is needed for all state-changing operations.
    """
    try:
        from flask_wtf.csrf import generate_csrf
        
        # Generate CSRF token tied to the session
        csrf_token = generate_csrf()
        
        return jsonify({
            "success": True,
            "csrf_token": csrf_token
        })
        
    except Exception as e:
        logger.error(f"Error generating CSRF token: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to generate CSRF token"
        }), 500

@auth2_bp.route("/verify-token")
def verify_token():
    """
    Legacy token verification endpoint for compatibility.
    Auth2 uses session-based auth, so this checks session status.
    """
    try:
        user = get_current_user_from_session()
        if user:
            return jsonify({
                "success": True,
                "data": user,
                "source": "session"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Not authenticated"
            }), 401
            
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to verify token"
        }), 500
