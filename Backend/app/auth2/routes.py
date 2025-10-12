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
from app.auth2.graphapi import validate_token, get_user_info_from_token, get_user_groups_from_token
from app.auth2.middleware import auth_required, rate_limit, get_current_user_from_session, clear_session, require_roles
from app.auth2.jwt_service import JWTService

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
    Initiate Microsoft authentication flow with JWT tokens.
    Accepts optional redirect_uri parameter for post-login redirection.
    """
    try:
        # Get and validate redirect URI
        frontend_redirect_uri = request.args.get('redirect_uri', auth2_config.ALLOWED_LOGIN_REDIRECTS[0])
        validated_redirect = validate_redirect_uri(frontend_redirect_uri)
        
        # Create state parameter with redirect URI
        import json
        import base64
        state_data = {
            'redirect_uri': validated_redirect,
            'timestamp': int(__import__('time').time())
        }
        state_encoded = base64.b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
        
        # Initiate MSAL auth flow with state parameter
        auth_flow = MSALService.initiate_auth_flow_with_state(state_encoded)
        
        # Store the code_verifier and nonce in a secure HttpOnly cookie for PKCE
        if 'code_verifier' in auth_flow:
            from flask import make_response
            import json
            import base64
            
            # Store both code_verifier and nonce in the cookie
            pkce_data = {
                'code_verifier': auth_flow['code_verifier'],
                'nonce': auth_flow.get('nonce', ''),
                'state': state_encoded
            }
            
            # Encode the PKCE data as base64 for storage
            pkce_data_encoded = base64.b64encode(json.dumps(pkce_data).encode('utf-8')).decode('utf-8')
            
            response = make_response(redirect(auth_flow["auth_uri"]))
            response.set_cookie(
                'pkce_data',
                pkce_data_encoded,
                httponly=True,
                secure=True,
                samesite='None',
                max_age=600  # 10 minutes expiration
            )
            return response
        
        logger.info(f"Initiated auth flow for redirect: {validated_redirect}")
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
    Handle Microsoft authentication callback using Graph API flow with JWT tokens.
    Processes the authorization code and creates a JWT token for the user.
    """
    try:
        # Get authorization code from request
        auth_code = request.args.get('code')
        if not auth_code:
            logger.error("No authorization code received")
            return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=no_code")
        
        # Get redirect URI from state parameter or use default
        state = request.args.get('state', '')
        redirect_uri = auth2_config.ALLOWED_LOGIN_REDIRECTS[0]
        
        # Try to parse state parameter for redirect URI
        if state:
            try:
                import json
                import base64
                state_data = json.loads(base64.b64decode(state).decode('utf-8'))
                if 'redirect_uri' in state_data:
                    redirect_uri = state_data['redirect_uri']
            except Exception as e:
                logger.warning(f"Could not parse state parameter: {e}")
        
        # For Railway deployment, use direct token acquisition with PKCE data from cookie
        # This avoids the "auth_flow_not_found" error when containers restart
        pkce_data_cookie = request.cookies.get('pkce_data')
        
        # Parse PKCE data from cookie
        code_verifier = None
        nonce = None
        if pkce_data_cookie:
            try:
                import json
                import base64
                pkce_data = json.loads(base64.b64decode(pkce_data_cookie).decode('utf-8'))
                code_verifier = pkce_data.get('code_verifier')
                nonce = pkce_data.get('nonce', '')
            except Exception as e:
                logger.error(f"Failed to parse PKCE data from cookie: {e}")
        
        result = MSALService.acquire_token_by_auth_code_direct(request.args, code_verifier, nonce)
        
        if "error" in result:
            error_msg = result.get('error_description', 'Authentication failed')
            error_code = result.get('error', 'unknown_error')
            logger.error(f"Authentication error: {error_code} - {error_msg}")
            
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=authentication_failed&details={error_code}"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Get access token for Graph API validation
        access_token = result.get("access_token")
        if not access_token:
            logger.error("No access token received")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=no_access_token"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Validate token using Graph API
        is_valid, user_data = validate_token(access_token)
        if not is_valid or not user_data:
            logger.error("Token validation failed")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=token_validation_failed"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Extract user information from Graph API response
        ms_object_id = user_data.get("id")
        display_id = user_data.get("userPrincipalName") or user_data.get("mail")
        organization_id = user_data.get("organizationId")
        
        # If organization_id is not in Graph response, get it from token claims
        if not organization_id:
            id_token_claims = result.get("id_token_claims", {})
            organization_id = id_token_claims.get("tid") 
        
        if not ms_object_id or not organization_id:
            logger.error("Missing required user identifiers")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=missing_identifiers"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Check if organization is allowed
        if not UserService.is_organization_allowed(organization_id):
            logger.warning(f"Organization {organization_id} is not allowed to access the system")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=organization_not_allowed"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Extract app roles from ID token claims
        from app.auth2.services import SecurityService
        id_token_claims = result.get("id_token_claims", {})
        user_app_roles = SecurityService.extract_app_roles_from_token(id_token_claims)
        
        # Validate that user has at least one valid app role
        if not user_app_roles:
            logger.warning(f"User {display_id} has no valid app roles assigned")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=no_app_role"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Use the first valid role
        user_role = user_app_roles[0]
        logger.info(f"User {display_id} authenticated with role: {user_role}")
        
        # Create or update user in database with role information
        db_success, db_error = UserService.create_or_update_user(
            ms_object_id, organization_id, display_id, user_role
        )
        if not db_success:
            logger.error(f"Database error: {db_error}")
            # Clear the PKCE data cookie on error
            from flask import make_response
            response = make_response(redirect(f"{redirect_uri}?error=database_error"))
            response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
            return response
        
        # Create JWT token with user data
        user_data_for_token = {
            "ms_object_id": ms_object_id,
            "organization_id": organization_id,
            "display_id": display_id,
            "role": user_role
        }
        
        jwt_token = JWTService.create_user_token(user_data_for_token)
        
        # Redirect to frontend with JWT token and clear the code_verifier cookie
        separator = '&' if '?' in redirect_uri else '?'
        final_redirect_url = f"{redirect_uri}{separator}token={jwt_token}&auth=success"
        
        # Clear the PKCE data cookie after successful authentication
        from flask import make_response
        response = make_response(redirect(final_redirect_url))
        response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
        
        return response
        
    except ValueError as e:
        logger.error(f"Invalid request to callback endpoint: {e}")
        return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=invalid_request")
    except Exception as e:
        logger.error(f"Unexpected error in callback: {e}")
        return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=server_error")

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
def profile():
    """
    Get authenticated user's profile information from JWT token.
    Primary endpoint for frontend to check active authentication.
    """
    try:
        # Get JWT token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False, 
                "error": "unauthorized",
                "message": "No token provided"
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Validate JWT token
        user = JWTService.validate_user_token(token)
        if not user:
            return jsonify({
                "success": False, 
                "error": "unauthorized",
                "message": "Invalid or expired token"
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
    Lightweight endpoint to verify JWT token exists.
    Returns basic authentication status without full user data.
    """
    try:
        # Get JWT token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False, 
                "message": "Not authenticated"
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Validate JWT token
        user = JWTService.validate_user_token(token)
        if user:
            return jsonify({
                "success": True,
                "message": "Token is valid",
                "user_id": user.get('ms_object_id', 'unknown')
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Not authenticated"
            }), 401
            
    except Exception as e:
        logger.error(f"Error checking token: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to check authentication"
        }), 500

@auth2_bp.route("/verify-auth")
def verify_auth():
    """
    Verify authentication after redirect from login callback.
    This endpoint is used by the frontend to bootstrap authentication after login.
    """
    try:
        # Get JWT token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "message": "Not authenticated"
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Validate JWT token
        user = JWTService.validate_user_token(token)
        if user:
            return jsonify({
                "success": True,
                "data": user,
                "source": "jwt"
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
    Get user data from Microsoft Graph API using Graph API flow.
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
        
        # Call Microsoft Graph API using Graph API functions
        access_token = result['access_token']
        success, user_id, email, user_data = get_user_info_from_token(access_token)
        
        if not success or not user_data:
            return jsonify({
                "error": "graph_api_failed",
                "message": "Failed to retrieve data from Graph API"
            }), 502
        
        # Get user groups if available
        user_groups = get_user_groups_from_token(access_token)
        
        # Combine user data with groups
        graph_data = {
            **user_data,
            "groups": list(user_groups) if user_groups else []
        }
        
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
