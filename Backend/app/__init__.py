from flask import Flask, jsonify
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
import os
import google.generativeai as genai
from app.config.settings import config
from dotenv import load_dotenv
import logging
from app.database.middleware import db_context_middleware
from datetime import timedelta
from flask_session import Session
from .powerbi_docs import powerbi_docs_bp


# Configure logging
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Load environment variables
load_dotenv()

# Configure Google AI API
genai.configure(api_key=config.GOOGLE_API_KEY)

# Initialize Flask extensions
session = Session()
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
    # Configure session handling for production
    app.secret_key = config.SECRET_KEY
    app.config['SESSION_TYPE'] = 'filesystem'  # Store sessions in files
    app.config['SESSION_FILE_DIR'] = os.path.join(os.getcwd(), 'flask_session')
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(seconds=config.PERMANENT_SESSION_LIFETIME)
    
    # Cookie security settings - production ready
    app.config['SESSION_COOKIE_SECURE'] = config.SECURE_COOKIES
    app.config['SESSION_COOKIE_SAMESITE'] = config.COOKIE_SAMESITE
    app.config['SESSION_COOKIE_HTTPONLY'] = config.SESSION_COOKIE_HTTPONLY
    app.config['SESSION_COOKIE_DOMAIN'] = config.SESSION_COOKIE_DOMAIN
    app.config['SESSION_USE_SIGNER'] = True  # Sign session cookies
    
    # Initialize Flask-Session
    Session(app)
    
    # Initialize CSRF Protection
    csrf.init_app(app)
    
    # Configure CSRF settings for production
    app.config['WTF_CSRF_CHECK_DEFAULT'] = True
    app.config['WTF_CSRF_TIME_LIMIT'] = None  # No time limit
    app.config['WTF_CSRF_SSL_STRICT'] = config.SECURE_COOKIES  # Enforce SSL in production
    
    # Configure CSRF referer checking based on environment
    if config.FLASK_ENV == 'production':
        app.config['WTF_CSRF_CHECK_REFERER'] = True
    else:
        app.config['WTF_CSRF_CHECK_REFERER'] = False
    
    # Configure CSRF exemptions for auth endpoints
    csrf.exempt('auth2.login')
    csrf.exempt('auth2.callback') 
    csrf.exempt('auth2.logout')
    csrf.exempt('auth2.get_csrf_token')
    csrf.exempt('auth2.verify_token')  # Legacy compatibility endpoint
    
    # Configure CSRF exemptions for streaming endpoints
    csrf.exempt('powerbi_chat.process_powerbi_query_stream')
    
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
    
    cors.init_app(app, origins=allowed_origins)
    
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
    
    # Configure Redis settings
    app.config['REDIS_HOST'] = config.REDIS_HOST
    app.config['REDIS_PORT'] = config.REDIS_PORT
    app.config['REDIS_PASSWORD'] = config.REDIS_PASSWORD

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
    from app.core.rate_limiter import rate_limit_headers
    rate_limit_headers(app)  # Add rate limit headers to responses
    
    # Apply comprehensive security headers to all responses
    @app.after_request
    def apply_security_headers(response):
        return SecurityHeaders.apply_security_headers(response)

    # Add custom error handler for RLS violations
    from app.core.exceptions import RLSPolicyViolationError
    
    @app.errorhandler(RLSPolicyViolationError)
    def handle_rls_violation(error):
        """Handle RLS policy violations with proper HTTP response."""
        app.logger.warning(f"RLS policy violation: {str(error)}")
        return jsonify({
            'error': 'Access denied',
            'message': 'You do not have permission to access this resource',
            'type': 'authorization_error'
        }), 403

    # Add global error handler for unhandled exceptions
    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        """Handle unhandled exceptions with proper logging."""
        app.logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        return jsonify({
            'error': 'An internal server error occurred',
            'message': 'Please try again later',
            'type': 'internal_error'
        }), 500

    # Import blueprints - only the ones that actually exist
    from app.auth2 import auth2_bp  # Authentication system
    from app.powerbi_chat import powerbi_chat_bp  # Power BI Chat functionality
    from app.powerbi_docs import powerbi_docs_bp  # Power BI Docs functionality

    # Register blueprints
    app.register_blueprint(auth2_bp, supports_credentials=True)  # Authentication at /api/auth
    app.register_blueprint(powerbi_chat_bp, supports_credentials=True)  # Power BI Chat
    app.register_blueprint(powerbi_docs_bp)  # Power BI Docs
    
    # API-only backend - no catch-all route needed
    # Frontend will be served separately

    return app