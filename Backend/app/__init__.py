from flask import Flask, jsonify
from flask_cors import CORS
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
    app.secret_key = config.SECRET_KEY  # Secret key for session management (if needed in future)
    
    app.logger.info("Using JWT-based authentication (no CSRF protection)")
    
    # Configure CORS for production deployment
    # Note: supports_credentials=True is required for:
    # - Sending/receiving httpOnly cookies (refresh_token)
    # - Cross-origin requests between frontend and backend
    # - SameSite=None cookies (required for cross-origin)
    # This must match the frontend's withCredentials: true setting
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
    
    # Initialize CORS with credentials support for cross-origin cookie handling
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
    from app.stats import stats_bp  # Statistics functionality

    # Register blueprints
    app.register_blueprint(auth2_bp, supports_credentials=True)  # Authentication at /api/auth
    app.register_blueprint(powerbi_chat_bp, supports_credentials=True)  # Power BI Chat
    app.register_blueprint(powerbi_docs_bp, supports_credentials=True)  # Power BI Docs
    app.register_blueprint(stats_bp, supports_credentials=True)  # Statistics at /api/stats
    
    # API-only backend - no catch-all route needed
    # Frontend will be served separately

    return app