"""
Auth2 Routes Module

Updated authentication routes with improved security and structure.
"""
import logging
from flask import jsonify, request, redirect
from flask_cors import cross_origin
from app.auth2 import auth2_bp
from app.auth2.config import Auth2Config

auth2_config = Auth2Config()
from app.auth2.services import MSALService, UserService
from app.auth2.graphapi import validate_token, get_user_info_from_token
from app.auth2.middleware import auth_required, rate_limit, get_current_user_from_token, clear_session
from app.auth2.jwt_service import JWTService

logger = logging.getLogger(__name__)

# --- Helper Functions ---

def validate_redirect_uri(redirect_uri: str) -> str:
    """Validate and sanitize redirect URI"""
    if not redirect_uri:
        return auth2_config.ALLOWED_LOGIN_REDIRECTS[0]
    
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

def clear_pkce_cookie(redirect_target):
    """Helper function to clear PKCE cookie from redirect response"""
    from flask import make_response
    response = make_response(redirect_target)
    response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
    return response

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
    
    Note: All organizations are allowed - no organization checks or restrictions are applied.
    Any user with a valid Microsoft authentication token can access the application.
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
        
        # Try to parse state parameter for redirect URI and validate timestamp
        if state:
            try:
                import json
                import base64
                import time
                state_data = json.loads(base64.b64decode(state).decode('utf-8'))
                
                # Validate timestamp to prevent replay attacks (10 minute window)
                timestamp = state_data.get('timestamp', 0)
                current_time = int(time.time())
                if current_time - timestamp > 600:  # 10 minutes
                    logger.warning(f"State parameter expired: {current_time - timestamp} seconds old")
                    return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=state_expired")
                
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
            return clear_pkce_cookie(redirect(f"{redirect_uri}?error=authentication_failed&details={error_code}"))
        
        # Get access token for Graph API validation
        access_token = result.get("access_token")
        if not access_token:
            logger.error("No access token received")
            # Clear the PKCE data cookie on error
            return clear_pkce_cookie(redirect(f"{redirect_uri}?error=no_access_token"))
        
        # Validate token using Graph API
        is_valid, user_data = validate_token(access_token)
        if not is_valid or not user_data:
            logger.error("Token validation failed")
            # Clear the PKCE data cookie on error
            return clear_pkce_cookie(redirect(f"{redirect_uri}?error=token_validation_failed"))
        
        # Extract user information from Graph API response
        # Note: No organization checks - all organizations are allowed
        ms_object_id = user_data.get("id")
        
        if not ms_object_id:
            logger.error("Missing required user identifiers")
            # Clear the PKCE data cookie on error
            return clear_pkce_cookie(redirect(f"{redirect_uri}?error=missing_identifiers"))
        
        # Extract email from Graph API data (prefer mail, fallback to userPrincipalName)
        email = user_data.get("mail") or user_data.get("userPrincipalName")
        
        # Create or update user - no organization restrictions applied
        db_success, db_error = UserService.create_or_update_user(
            ms_object_id,
            email=email
        )

        if not db_success:
            logger.error(f"Database error: {db_error}")
            # Clear the PKCE data cookie on error
            return clear_pkce_cookie(redirect(f"{redirect_uri}?error=database_error"))
        
        # Create JWT token with user data
        user_data_for_token = {
            "ms_object_id": ms_object_id
        }
        
        access_token, refresh_token = JWTService.create_user_token(user_data_for_token)
        
        # Redirect to frontend with JWT token and clear the code_verifier cookie
        separator = '&' if '?' in redirect_uri else '?'
        final_redirect_url = f"{redirect_uri}{separator}token={access_token}&auth=success"
        
        # Clear the PKCE data cookie and set refresh token cookie
        from flask import make_response
        response = make_response(redirect(final_redirect_url))
        response.set_cookie('pkce_data', '', expires=0, httponly=True, secure=True, samesite='None')
        response.set_cookie(
            'refresh_token',
            refresh_token,
            httponly=True,
            secure=True,
            samesite='None',
            max_age=7*24*3600  # 7 days
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Invalid request to callback endpoint: {e}")
        return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=invalid_request")
    except Exception as e:
        logger.error(f"Unexpected error in callback: {e}")
        return redirect(f"{auth2_config.ALLOWED_LOGIN_REDIRECTS[0]}?error=server_error")

@auth2_bp.route("/refresh")
def refresh_token():
    """
    Refresh access token using refresh token from cookie.
    Returns new access token and refresh token.
    """
    try:
        # Get refresh token from cookie
        refresh_token = request.cookies.get('refresh_token')
        if not refresh_token:
            return jsonify({
                "success": False,
                "error": "no_refresh_token",
                "message": "No refresh token provided"
            }), 401
        
        # Refresh the tokens
        result = JWTService.refresh_access_token(refresh_token)
        if not result:
            return jsonify({
                "success": False,
                "error": "invalid_refresh_token",
                "message": "Invalid or expired refresh token"
            }), 401
        
        new_access_token, new_refresh_token = result
        
        # Create response with new access token
        response = jsonify({
            "success": True,
            "access_token": new_access_token
        })
        
        # Set new refresh token cookie
        response.set_cookie(
            'refresh_token',
            new_refresh_token,
            httponly=True,
            secure=True,
            samesite='None',
            max_age=7*24*3600  # 7 days
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to refresh token"
        }), 500

@auth2_bp.route("/logout")
def logout():
    """
    Log out user and redirect to Microsoft logout.
    Clears session and redirects to Microsoft's logout endpoint.
    """
    try:
        # Clear user session
        clear_session()
        
        # Clear refresh token cookie
        from flask import make_response
        frontend_root_url = f"{auth2_config.FRONTEND_URL}/"
        logout_uri = f"{auth2_config.MSAL_AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri={frontend_root_url}"
        
        response = make_response(redirect(logout_uri))
        response.set_cookie('refresh_token', '', expires=0, httponly=True, secure=True, samesite='None')
        
        return response
        
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        # On error, redirect to root page
        return redirect(f"{auth2_config.FRONTEND_URL}/")

# --- Protected API Routes ---

@auth2_bp.route("/profile")
def profile():
    """
    Get authenticated user's profile information from JWT token.
    Primary endpoint for frontend to check active authentication.
    Returns full user data including subscription from database.
    """
    try:
        # Get user from JWT token
        user = get_current_user_from_token()
        if not user:
            return jsonify({
                "success": False, 
                "error": "unauthorized",
                "message": "Invalid or expired token"
            }), 401
        
        # Get full user data from database including subscription and email
        ms_object_id = user.get('ms_object_id')
        if ms_object_id:
            full_user_data = UserService.get_user_by_ms_object_id(ms_object_id)
            if full_user_data:
                # Get display_id from email stored in database, or Graph API data, or user ID as fallback
                display_id = None
                # First try email from database
                if full_user_data.get('email'):
                    display_id = full_user_data.get('email')
                # Then try Graph API data if available
                elif user.get('graph_data'):
                    graph_data = user.get('graph_data')
                    display_id = graph_data.get('userPrincipalName') or graph_data.get('mail')
                
                if not display_id:
                    # Fallback to user ID if no email available
                    display_id = str(full_user_data.get('id'))
                
                # Merge JWT user data with database user data
                user_data = {
                    'ms_object_id': full_user_data.get('ms_object_id'),
                    'display_id': display_id,
                    'email': full_user_data.get('email'),
                    'subscription': full_user_data.get('subscription', 'none')
                }
                
                return jsonify({
                    "success": True, 
                    "data": user_data
                })
        
        # Fallback to JWT user data if database lookup fails
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
        # Get user from JWT token
        user = get_current_user_from_token()
        if not user:
            return jsonify({
                "success": False, 
                "message": "Not authenticated"
            }), 401
        
        return jsonify({
            "success": True,
            "message": "Token is valid",
            "user_id": user.get('ms_object_id', 'unknown')
        })
            
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
        # Get user from JWT token
        user = get_current_user_from_token()
        if not user:
            return jsonify({
                "success": False,
                "message": "Not authenticated"
            }), 401
        
        return jsonify({
            "success": True,
            "data": user,
            "source": "jwt"
        })
            
    except Exception as e:
        logger.error(f"Error in verify-auth: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to verify authentication"
        }), 500

@auth2_bp.route("/graph-data")
@auth_required
def get_graph_data():
    """
    Get user data from Microsoft Graph API using Graph API flow.
    Requires valid authentication and Graph API permissions.
    """
    try:
        user = g.current_user
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
        
        return jsonify(user_data)
        
    except Exception as e:
        logger.error(f"Error getting Graph data: {e}")
        return jsonify({
            "error": "server_error",
            "message": "An error occurred while fetching data"
        }), 500

# --- Legacy Compatibility Routes ---

@auth2_bp.route("/verify-token")
def verify_token():
    """
    Legacy token verification endpoint for compatibility.
    Uses JWT token authentication.
    """
    try:
        user = get_current_user_from_token()
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
        logger.error(f"Error verifying token: {e}")
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to verify token"
        }), 500