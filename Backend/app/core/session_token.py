"""
Session Token Management

Provides functions to manage browser-based session tokens for user identification.
This replaces IP-based identification to support VPNs and shared networks.
"""

import uuid
import logging
from flask import request, make_response
from app.config.settings import config

logger = logging.getLogger(__name__)

# Cookie name for session token
SESSION_TOKEN_COOKIE_NAME = 'claribi_session_token'

def generate_session_token() -> str:
    """
    Generate a new cryptographically secure session token.
    
    Returns:
        str: UUID v4 string
    """
    return str(uuid.uuid4())

def get_session_token_from_request() -> str:
    """
    Get session token from request cookie.
    
    Returns:
        str: Session token if found, None otherwise
    """
    # Log all cookies for debugging
    all_cookies = list(request.cookies.keys())
    if all_cookies:
        logger.debug(f"Request has cookies: {', '.join(all_cookies)}")
    else:
        logger.debug("Request has no cookies")
    
    token = request.cookies.get(SESSION_TOKEN_COOKIE_NAME)
    if token:
        logger.info(f"Found session token in request cookie: {token[:8]}...")
    else:
        logger.warning(f"No session token cookie '{SESSION_TOKEN_COOKIE_NAME}' found in request. Available cookies: {all_cookies}")
    return token

def get_or_create_session_token() -> str:
    """
    Get existing session token from cookie, or generate a new one if missing.
    This should be called at the start of each request that needs user identification.
    
    Returns:
        str: Session token (existing or newly generated)
    """
    from flask import g
    
    # Check if we already have a token for this request (from middleware)
    if hasattr(g, 'session_token') and g.session_token:
        logger.debug(f"Using session token from Flask g: {g.session_token[:8]}...")
        return g.session_token
    
    # Try to get from cookie
    token = get_session_token_from_request()
    
    if not token:
        # Generate new token
        token = generate_session_token()
        logger.info(f"Generated new session token (no cookie found): {token[:8]}...")
    else:
        # Validate token format (should be UUID)
        try:
            uuid.UUID(token)
            logger.debug(f"Using existing session token from cookie: {token[:8]}...")
        except ValueError:
            # Invalid token format, generate new one
            logger.warning(f"Invalid session token format '{token[:20]}...', generating new one")
            token = generate_session_token()
    
    # Store in Flask g for this request
    g.session_token = token
    
    return token

def set_session_token_cookie(response, token: str):
    """
    Set session token in response cookie.
    
    Args:
        response: Flask response object
        token: Session token to set
    
    Returns:
        Flask response with cookie set
    """
    from flask import request
    
    # Cookie settings
    max_age = 365 * 24 * 60 * 60  # 1 year (effectively permanent)
    secure = config.SECURE_COOKIES
    httponly = True  # Prevent JavaScript access (XSS protection)
    samesite = config.COOKIE_SAMESITE
    domain = config.COOKIE_DOMAIN if hasattr(config, 'COOKIE_DOMAIN') and config.COOKIE_DOMAIN else None
    path = '/'  # Explicitly set path to root
    
    # Log request origin for debugging
    origin = request.headers.get('Origin', 'No Origin header')
    referer = request.headers.get('Referer', 'No Referer header')
    
    # For cross-origin cookies, we need to be very explicit
    # Set cookie with all required attributes for cross-origin support
    try:
        response.set_cookie(
            SESSION_TOKEN_COOKIE_NAME,
            value=token,
            max_age=max_age,
            secure=secure,
            httponly=httponly,
            samesite=samesite,
            domain=domain,
            path=path
        )
        
        # Note: Access-Control-Allow-Credentials is handled by Flask-CORS
        # configured globally in app/__init__.py with supports_credentials=True
        # Do not set it manually here to avoid duplicate headers
        
        logger.info(
            f"Set session token cookie: {token[:8]}... "
            f"(secure={secure}, samesite={samesite}, domain={domain or 'default'}, path={path}, "
            f"origin={origin}, referer={referer[:50] if referer != 'No Referer header' else referer})"
        )
    except Exception as e:
        logger.error(f"Failed to set session token cookie: {e}", exc_info=True)
        # Don't fail the request if cookie setting fails
    
    return response

def ensure_session_token_in_response(response, token: str = None):
    """
    Ensure session token cookie is set in response.
    If token is not provided, gets or creates one from request.
    
    Always sets the cookie to ensure it persists, even if it was already in the request.
    This is important for cross-origin scenarios where cookies might not be sent reliably.
    
    Args:
        response: Flask response object
        token: Optional session token (if None, gets from request or generates new)
    
    Returns:
        Flask response with cookie set
    """
    from flask import g
    
    # Get token from Flask g if available (set by middleware), otherwise get/create
    if token is None:
        if hasattr(g, 'session_token') and g.session_token:
            token = g.session_token
            logger.debug(f"Using token from Flask g for response: {token[:8]}...")
        else:
            token = get_or_create_session_token()
    
    # Always set the cookie to ensure it persists and is sent to the browser
    # This is especially important for cross-origin requests where cookies
    # might not be reliably sent from the browser
    response = set_session_token_cookie(response, token)
    logger.info(f"Ensured session token cookie in response: {token[:8]}...")
    
    return response

