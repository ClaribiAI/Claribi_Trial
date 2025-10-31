from flask import Flask, jsonify
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
import os
import google.generativeai as genai
from app.config.settings import config
from dotenv import load_dotenv
import logging
from app.database.middleware import db_context_middleware
from .powerbi_docs import powerbi_docs_bp


# Configure logging
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Load environment variables
load_dotenv()

# Configure Google AI API
genai.configure(api_key=config.GOOGLE_API_KEY)

# Initialize Flask extensions
cors = CORS(supports_credentials=True)
csrf = CSRFProtect()

def create_app():
    """
    Create and configure the Flask application.
    
    This factory function creates a Flask app with:
    - Authentication system (auth2)
    - Power BI Chat functionality
    - Power BI Docs functionality
    - Production-ready security settings
    """
    app = Flask(__name__, template_folder='../templates')
    app.config['ENV'] = config.FLASK_ENV
    # Configure minimal session handling for CSRF protection only
    app.secret_key = config.SECRET_KEY
    
    # Minimal session configuration for CSRF protection
    app.config['SESSION_COOKIE_SECURE'] = config.SECURE_COOKIES
    app.config['SESSION_COOKIE_SAMESITE'] = config.COOKIE_SAMESITE
    app.config['SESSION_COOKIE_HTTPONLY'] = config.SESSION_COOKIE_HTTPONLY
    app.config['SESSION_COOKIE_PATH'] = '/'  # Ensure cookie is sent for all paths
    app.config['PERMANENT_SESSION_LIFETIME'] = config.PERMANENT_SESSION_LIFETIME  # Set session lifetime
    # For cross-origin cookies with SameSite=None, don't set domain
    # Setting domain can prevent cookie from being sent correctly in cross-origin scenarios
    # Only set domain if explicitly configured AND not using SameSite=None
    if config.COOKIE_DOMAIN and config.COOKIE_SAMESITE != 'None':
        app.config['SESSION_COOKIE_DOMAIN'] = config.COOKIE_DOMAIN
    else:
        # Explicitly set to None to avoid Flask defaulting to a domain
        app.config['SESSION_COOKIE_DOMAIN'] = None
    
    # Log cookie configuration for debugging
    app.logger.info(f"Session cookie configuration: Secure={config.SECURE_COOKIES}, SameSite={config.COOKIE_SAMESITE}, HttpOnly={config.SESSION_COOKIE_HTTPONLY}, Domain={app.config['SESSION_COOKIE_DOMAIN']}")
    app.logger.info("Using simplified JWT-based authentication (no session storage)")
    
    # Configure CSRF settings BEFORE initializing CSRF Protection
    app.config['WTF_CSRF_CHECK_DEFAULT'] = True
    app.config['WTF_CSRF_TIME_LIMIT'] = None  # No time limit
    
    # Configure CSRF referer checking based on environment
    # In production with cross-origin setup (different domains), disable referer checking
    # as it can cause issues with cross-origin requests
    if config.FLASK_ENV == 'production':
        # Disable referer checking for cross-origin production deployment
        # The session cookie validation provides sufficient security
        app.config['WTF_CSRF_CHECK_REFERER'] = False
        app.config['WTF_CSRF_SSL_STRICT'] = True
        app.logger.info("CSRF configured for production: referer checking disabled for cross-origin support, SSL strict enabled")
    else:
        # Development settings - more permissive
        app.config['WTF_CSRF_CHECK_REFERER'] = False
        app.config['WTF_CSRF_SSL_STRICT'] = False
        app.config['WTF_CSRF_METHODS'] = ['POST', 'PUT', 'PATCH', 'DELETE']  # Only check these methods
        app.logger.info("CSRF configured for development: referer checking disabled, SSL strict disabled")
    
    # Initialize CSRF Protection AFTER configuration
    csrf.init_app(app)
    
    # Configure CSRF exemptions for auth endpoints
    csrf.exempt('auth2.login')
    csrf.exempt('auth2.callback') 
    csrf.exempt('auth2.logout')
    csrf.exempt('auth2.get_csrf_token')
    csrf.exempt('auth2.verify_token')  # Legacy compatibility endpoint
    
    # Configure CSRF exemptions for streaming endpoints
    csrf.exempt('powerbi_chat.process_powerbi_query_stream')
    
    # Configure CSRF exemptions for Power BI docs endpoints
    # These endpoints require JWT authentication, providing sufficient security
    # Session cookies are unreliable in cross-origin production deployments
    csrf.exempt('powerbi_docs.list_uploaded_files')
    csrf.exempt('powerbi_docs.get_file_summaries')
    csrf.exempt('powerbi_docs.get_generated_docs')
    csrf.exempt('powerbi_docs.analyze_pbix_section_route')
    csrf.exempt('powerbi_docs.parse_improvement_recommendations_route')
    
    # Configure CORS for production deployment
    allowed_origins = []
    
    # Add configured frontend URL
    if config.FRONTEND_URL:
        allowed_origins.append(config.FRONTEND_URL)
    
    # Add production frontend URL if set
    if os.getenv("PRODUCTION_FRONTEND_URL"):
        allowed_origins.append(os.getenv("PRODUCTION_FRONTEND_URL"))
    
    # Add additional allowed origins from environment
    if os.getenv("ALLOWED_ORIGINS"):
        additional_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS").split(',') if origin.strip()]
        allowed_origins.extend(additional_origins)
    
    # Fallback for development
    if not allowed_origins and config.FLASK_ENV == 'development':
        allowed_origins = ['http://localhost:5173', 'https://localhost:5173']
    
    cors.init_app(app, origins=allowed_origins, supports_credentials=True)
    
    # Load Microsoft AD config from environment
    app.config['MICROSOFT_CLIENT_ID'] = os.getenv("MICROSOFT_CLIENT_ID")
    app.config['MICROSOFT_CLIENT_SECRET'] = os.getenv("MICROSOFT_CLIENT_SECRET")
    app.config['MICROSOFT_TENANT_ID'] = os.getenv("MICROSOFT_TENANT_ID")
    app.config['MICROSOFT_REDIRECT_URI'] = os.getenv("MICROSOFT_REDIRECT_URI")
    app.config['MICROSOFT_AUTHORITY'] = os.getenv("MICROSOFT_AUTHORITY")
    app.config['MICROSOFT_SCOPE'] = os.getenv('MICROSOFT_SCOPE')  # Define directly as a list instead of splitting env var

    # Configure app settings
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
    app.config['FRONTEND_URL'] = config.FRONTEND_URL
    app.config['BACKEND_URL'] = config.BACKEND_URL
    
    # Redis configuration removed - using JWT tokens instead

    #Configure encryption 
    app.config['TOKEN_ENCRYPTION_KEY'] = config.TOKEN_ENCRYPTION_KEY
    app.config['TOKEN_ENCRYPTION_ALGORITHM'] = config.TOKEN_ENCRYPTION_ALGORITHM

    #NEON Auth --> Not used for now (does not support python)
    #app.config['NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL'] = config.NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL
    #app.config['DATABASE_AUTHENTICATED_URL'] = config.DATABASE_AUTHENTICATED_URL
    app.config['DATABASE_URL'] = config.DATABASE_URL
    
    # Register database middleware - use only one RLS context setting method
    db_context_middleware(app)

    # Register security middleware
    from app.auth2.middleware import SecurityHeaders
    from app.core.simple_rate_limiter import rate_limit_headers
    rate_limit_headers(app)  # Add rate limit headers to responses
    
    # Apply comprehensive security headers to all responses
    @app.after_request
    def apply_security_headers(response):
        # Log session cookie in response headers for debugging (in production)
        if config.FLASK_ENV == 'production' and 'Set-Cookie' in response.headers:
            app.logger.info(f"Session cookie header set: {response.headers.get('Set-Cookie', 'None')[:200]}")
        return SecurityHeaders.apply_security_headers(response)

    # Centralized error handling using standardized error envelope
    from app.core.responses import error_response
    from app.core.exceptions import AppError, RLSPolicyViolationError

    @app.errorhandler(RLSPolicyViolationError)
    def handle_rls_violation(error):
        app.logger.warning(f"RLS policy violation: {str(error)}")
        # Map to 403 with consistent envelope
        return error_response(403, "You do not have permission to access this resource", None, "403")

    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        # Use the code/message carried by the exception
        return error_response(error.code or 500, error.message or "An unexpected error occurred", None, str(error.code or 500))

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        app.logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        return error_response(500, "An unexpected error occurred")

    # Import blueprints - only the ones that actually exist
    from app.auth2 import auth2_bp  # Authentication system
    from app.powerbi_chat import powerbi_chat_bp  # Power BI Chat functionality
    from app.powerbi_docs import powerbi_docs_bp  # Power BI Docs functionality

    # Register blueprints
    app.register_blueprint(auth2_bp, supports_credentials=True)  # Authentication at /api/auth
    app.register_blueprint(powerbi_chat_bp, supports_credentials=True)  # Power BI Chat
    app.register_blueprint(powerbi_docs_bp, supports_credentials=True)  # Power BI Docs
    
    # API-only backend - no catch-all route needed
    # Frontend will be served separately

    return app