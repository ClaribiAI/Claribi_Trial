from flask import Flask
from flask_cors import CORS
import os
import google.generativeai as genai
from app.config.settings import config
from dotenv import load_dotenv
import logging
from app.database.middleware import db_context_middleware
from datetime import timedelta
from flask_session import Session  # Import Flask-Session
from flask import redirect
from app.favorites.favorites import favorites_bp

logging.getLogger('werkzeug').setLevel(logging.WARNING)
# Configure Gemini API
genai.configure(api_key=config.GOOGLE_API_KEY)
load_dotenv()

# Database schema is managed by Alembic migrations

def create_app():
    app = Flask(__name__, template_folder='../templates')
    app.config['ENV'] = os.getenv("FLASK_ENV", "development")
    # Configure session handling
    app.secret_key = config.SECRET_KEY  # Use secret key from settings
    app.config['SESSION_TYPE'] = 'filesystem'  # Store sessions on filesystem for persistence
    app.config['SESSION_PERMANENT'] = True  # Make sessions persistent
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # Session lifetime
    
    # Cookie security settings - allow non-HTTPS in development but secure in production
    if os.getenv("FLASK_ENV") == "production":
        app.config['SESSION_COOKIE_SECURE'] = True  # Require HTTPS for cookies
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Allow cross-site cookies
    else:
        app.config['SESSION_COOKIE_SECURE'] = True  # Allow HTTP in development
        app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # More permissive in development
    
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # HTTP only cookies
    app.config['SESSION_FILE_DIR'] = os.path.join(os.getcwd(), 'flask_session')  # Store sessions in a directory
    app.config['SESSION_USE_SIGNER'] = True  # Sign session cookies
    
    # Initialize Flask-Session
    Session(app)
    
    # Configure CORS to allow requests from frontend with credentials
    allowed_origins = [
        "https://localhost:5173",  # React dev server
        "http://localhost:5173",   # React dev server without HTTPS
        "https://127.0.0.1:5000",  # Flask dev server
        "http://127.0.0.1:5000",   # Flask dev server without HTTPS
    ]
    
    # Production hosts would be added here
    if os.getenv("PRODUCTION_FRONTEND_URL"):
        allowed_origins.append(os.getenv("PRODUCTION_FRONTEND_URL"))
    
    CORS(app, 
         supports_credentials=True, 
         origins=allowed_origins, 
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
         expose_headers=["Set-Cookie", "Access-Control-Allow-Credentials"],
         resources={r"/*": {"origins": allowed_origins}})  # Apply to all routes
    
    # Load Microsoft AD config from environment
    app.config['MICROSOFT_CLIENT_ID'] = os.getenv("MICROSOFT_CLIENT_ID")
    app.config['MICROSOFT_CLIENT_SECRET'] = os.getenv("MICROSOFT_CLIENT_SECRET")
    app.config['MICROSOFT_TENANT_ID'] = os.getenv("MICROSOFT_TENANT_ID")
    app.config['MICROSOFT_REDIRECT_URI'] = os.getenv("MICROSOFT_REDIRECT_URI")
    app.config['MICROSOFT_AUTHORITY'] = os.getenv("MICROSOFT_AUTHORITY")
    app.config['MICROSOFT_SCOPE'] = os.getenv('MICROSOFT_SCOPE')  # Define directly as a list instead of splitting env var

    # Configure app settings
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
    
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

    # Disable HTTPS enforcement for local development
    app.config['FORCE_HTTPS'] = False

    # Register security middleware
    from app.core.security import secure_headers
    secure_headers(app)

    # Import blueprints
    from app.projects import projects_bp
    from app.reports import reports_bp
    from app.file_processing import file_processing_bp
    from app.synonyms import synonyms_bp
    from app.chatbot import chatbot_bp
    from app.report_pages import report_pages_bp
    from app.auth import auth_bp
    from app.analytics import analytics_bp


    # Register blueprints
    app.register_blueprint(auth_bp, supports_credentials=True, url_prefix='/auth')
    app.register_blueprint(projects_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(file_processing_bp, url_prefix='/api')
    app.register_blueprint(synonyms_bp)
    app.register_blueprint(chatbot_bp, supports_credentials=True, url_prefix='/api')
    app.register_blueprint(report_pages_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(analytics_bp)
    
    # Add a catch-all route for SPA navigation that doesn't match API endpoints
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        # Check if the request is for a specific API endpoint or asset
        if path.startswith(('api/', 'auth/', 'static/', 'assets/')):
            # Let the request fall through to the appropriate handler
            return app.send_static_file('404.html'), 404
        
        # For all other routes, serve the index page to let the frontend router handle it
        return redirect('/')

    return app