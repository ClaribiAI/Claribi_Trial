import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Application settings
class Config:
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://localhost:5173')
    BACKEND_URL = os.getenv('BACKEND_URL', 'https://127.0.0.1:5000')
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')  # Default from __init__.py
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')

    # Centralized cookie/security flags
    SECURE_COOKIES = os.getenv('SECURE_COOKIES', 'true' if FLASK_ENV == 'production' else 'false').lower() == 'true'

    # Set SameSite cookie policy
    # In production, frontend and backend are on different domains, so use None for cross-origin support
    # Environment variable takes precedence if explicitly set
    _cookie_samesite_env = os.getenv('COOKIE_SAMESITE')
    if _cookie_samesite_env:
        # Explicitly set via environment variable takes precedence
        COOKIE_SAMESITE = _cookie_samesite_env
    elif FLASK_ENV == 'production':
        # Production: Always use None for cross-origin cookie support
        COOKIE_SAMESITE = 'None'
        # Ensure SECURE_COOKIES is True when SameSite=None (required by browsers)
        if not SECURE_COOKIES:
            SECURE_COOKIES = True
    else:
        # Development defaults to Lax
        COOKIE_SAMESITE = 'Lax'

    # Ensure SECURE_COOKIES is True when SameSite=None (required by browser security)
    if COOKIE_SAMESITE == 'None' and not SECURE_COOKIES:
        SECURE_COOKIES = True

    COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN')  # Optional explicit cookie domain
    ENABLE_HSTS = os.getenv('ENABLE_HSTS', 'true' if FLASK_ENV == 'production' else 'false').lower() == 'true'

    # Feature flags
    AUTH_DEV_FALLBACKS_ENABLED = os.getenv('AUTH_DEV_FALLBACKS_ENABLED', 'false').lower() == 'true'
    ENABLE_AUTH_DEBUG = os.getenv('ENABLE_AUTH_DEBUG', 'false').lower() == 'true'
    
    # Allowlist for login redirect URIs (comma-separated). FRONTEND_URL is always allowed.
    _ALLOWED_REDIRECTS_ENV = os.getenv('ALLOWED_LOGIN_REDIRECTS', '')
    ALLOWED_LOGIN_REDIRECTS = [url.strip() for url in _ALLOWED_REDIRECTS_ENV.split(',') if url.strip()] or []
    if FRONTEND_URL and FRONTEND_URL not in ALLOWED_LOGIN_REDIRECTS:
        ALLOWED_LOGIN_REDIRECTS.append(FRONTEND_URL)

    # Security configurations
    SESSION_COOKIE_SECURE = SECURE_COOKIES
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    REMEMBER_COOKIE_SECURE = SECURE_COOKIES
    PERMANENT_SESSION_LIFETIME = 3600  # seconds
    SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE
    SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN if COOKIE_DOMAIN else None

    # File validation settings
    ALLOWED_EXTENSIONS = {'tmdl'}
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max upload size to match frontend

    # Database settings
    # DATABASE_URL is the standard Railway convention for database connection strings
    # For Neon, this should be a pooled connection string (with -pooler in endpoint)
    DATABASE_URL = os.getenv('DATABASE_URL')  # Pooled connection string for Neon PostgreSQL (Railway standard)

    # Ensure sslmode=require is in the DATABASE_URL for Neon PostgreSQL
    if DATABASE_URL and 'neon.tech' in DATABASE_URL and 'sslmode=' not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require" if "?" not in DATABASE_URL else "&sslmode=require"

    # NEON_CONNECTION_STRING defaults to DATABASE_URL for backward compatibility
    # Railway should set DATABASE_URL (standard convention)
    # Both should point to the same Neon database
    _neon_conn_str = os.getenv('NEON_CONNECTION_STRING')
    if _neon_conn_str:
        # If NEON_CONNECTION_STRING is explicitly set, use it
        # Ensure sslmode=require for Neon
        if 'neon.tech' in _neon_conn_str and 'sslmode=' not in _neon_conn_str:
            _neon_conn_str += "?sslmode=require" if "?" not in _neon_conn_str else "&sslmode=require"
        NEON_CONNECTION_STRING = _neon_conn_str
    else:
        # Default to DATABASE_URL if NEON_CONNECTION_STRING is not set
        NEON_CONNECTION_STRING = DATABASE_URL

    # Validate that both connection strings point to the same database (if both are set)
    if DATABASE_URL and _neon_conn_str and DATABASE_URL != _neon_conn_str:
        import warnings
        warnings.warn(
            "DATABASE_URL and NEON_CONNECTION_STRING point to different databases. "
            "This may cause connection issues. Consider using only DATABASE_URL (Railway standard).",
            UserWarning
        )

    POSTGRES_HOST = os.getenv('POSTGRES_HOST')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
    POSTGRES_DB = os.getenv('POSTGRES_DB')
    POSTGRES_USER = os.getenv('POSTGRES_USER')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
    POSTGRES_SSLMODE = os.getenv('POSTGRES_SSLMODE', 'require')  # Default to require SSL
    
    # Database connection pool settings
    DB_POOL_MIN_CONN = int(os.getenv('DB_POOL_MIN_CONN', '5'))
    DB_POOL_MAX_CONN = int(os.getenv('DB_POOL_MAX_CONN', '20'))
    DB_CONNECTION_TIMEOUT = int(os.getenv('DB_CONNECTION_TIMEOUT', '30'))  # Timeout in seconds
    DB_CONNECTION_RETRIES = int(os.getenv('DB_CONNECTION_RETRIES', '3'))  # Retry count for connection acquisition
    DB_VALIDATION_RETRIES = int(os.getenv('DB_VALIDATION_RETRIES', '5'))  # Retry count for validation operations

    # Database connection string
    @property
    def DATABASE_URI(self):
        # Prioritize direct connection string if available
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Fall back to constructing from individual components
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Database connection parameters as dictionary
    @property
    def DB_CONFIG(self):
        return {
            'host': self.POSTGRES_HOST,
            'port': self.POSTGRES_PORT,
            'database': self.POSTGRES_DB,
            'user': self.POSTGRES_USER,
            'password': self.POSTGRES_PASSWORD,
            'sslmode': self.POSTGRES_SSLMODE
        }
    
    # Helper methods for Neon connection strings
    @staticmethod
    def is_pooled_connection_string(conn_str: str) -> bool:
        """Check if connection string is a pooled connection (contains -pooler in endpoint)."""
        if not conn_str:
            return False
        return '-pooler' in conn_str

    @staticmethod
    def get_direct_connection_string(conn_str: str) -> str:
        """Convert pooled connection string to direct connection string (remove -pooler)."""
        if not conn_str:
            return conn_str
        # Remove -pooler from endpoint
        if '-pooler' in conn_str:
            # Replace -pooler with nothing in the endpoint
            # Pattern matches: ep-xxx-pooler.region.aws.neon.tech -> ep-xxx.region.aws.neon.tech
            import re
            conn_str = re.sub(r'(ep-[a-z0-9-]+)-pooler\.', r'\1.', conn_str)
        return conn_str

    @staticmethod
    def get_pooled_connection_string(conn_str: str) -> str:
        """Convert direct connection string to pooled connection string (add -pooler)."""
        if not conn_str:
            return conn_str
        # Add -pooler to endpoint if not already present
        if '-pooler' not in conn_str and 'neon.tech' in conn_str:
            import re
            # Match endpoint pattern: ep-xxx.region.aws.neon.tech -> ep-xxx-pooler.region.aws.neon.tech
            conn_str = re.sub(r'(ep-[a-z0-9-]+)\.', r'\1-pooler.', conn_str)
        return conn_str

    # API settings
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

    # RAG Pipeline Settings
    VECTOR_EMBEDDING_MODEL = os.getenv('VECTOR_EMBEDDING_MODEL', 'text-embedding-004')
    RAG_LLM_MODEL = os.getenv('RAG_LLM_MODEL', 'gemini-2.5-flash')
    VECTOR_STORE_COLLECTION_PREFIX = os.getenv('VECTOR_STORE_COLLECTION_PREFIX', 'pbix_')
    MAX_RETRIEVAL_DOCS = int(os.getenv('MAX_RETRIEVAL_DOCS', '5'))

    # Iterative RAG Settings
    ENABLE_ITERATIVE_RAG = os.getenv('ENABLE_ITERATIVE_RAG', 'true').lower() == 'true'
    MAX_RAG_ITERATIONS = int(os.getenv('MAX_RAG_ITERATIONS', '4'))
    MAX_FOLLOW_UP_QUERIES_PER_ITERATION = int(os.getenv('MAX_FOLLOW_UP_QUERIES_PER_ITERATION', '3'))
    RAG_CONTEXT_ANALYSIS_THRESHOLD = float(os.getenv('RAG_CONTEXT_ANALYSIS_THRESHOLD', '0.7'))

    # Microsoft AD Authentication Settings (Legacy)
    MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
    MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
    MICROSOFT_TENANT_ID = os.getenv('MICROSOFT_TENANT_ID')  # For multi-tenant apps
    MICROSOFT_REDIRECT_URI = os.getenv('MICROSOFT_REDIRECT_URI', f"{BACKEND_URL}/api/auth/callback")
    MICROSOFT_AUTHORITY = os.getenv('MICROSOFT_AUTHORITY', f'https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}')
    MICROSOFT_SCOPE = os.getenv("MICROSOFT_SCOPE")
    
    # Auth2 System - New MSAL Configuration
    MSAL_CLIENT_ID = os.getenv('MSAL_CLIENT_ID', MICROSOFT_CLIENT_ID)  # Fallback to legacy
    MSAL_CLIENT_SECRET = os.getenv('MSAL_CLIENT_SECRET', MICROSOFT_CLIENT_SECRET)  # Fallback to legacy
    MSAL_TENANT_ID = os.getenv('MSAL_TENANT_ID', MICROSOFT_TENANT_ID)  # Fallback to legacy
    
    # Auth2 Security Settings
    AUTH2_ENABLE_DEBUG = os.getenv('AUTH2_ENABLE_DEBUG', 'false').lower() == 'true'
    AUTH2_RATE_LIMIT_LOGIN = os.getenv('AUTH2_RATE_LIMIT_LOGIN', '5 per minute')
    AUTH2_RATE_LIMIT_CALLBACK = os.getenv('AUTH2_RATE_LIMIT_CALLBACK', '10 per minute') 

    # Token Encryption Settings
    TOKEN_ENCRYPTION_KEY = os.getenv('TOKEN_ENCRYPTION_KEY')  # Default to SECRET_KEY if not set
    # If not provided, generate a key derived from SECRET_KEY
    if not TOKEN_ENCRYPTION_KEY:
        import base64
        import hashlib
        # Derive a key from the SECRET_KEY
        hashed_key = hashlib.sha256(SECRET_KEY.encode()).digest()
        TOKEN_ENCRYPTION_KEY = base64.urlsafe_b64encode(hashed_key).decode()

    TOKEN_ENCRYPTION_ALGORITHM = os.getenv('TOKEN_ENCRYPTION_ALGORITHM', 'fernet')


    # Always enforce HTTPS for share URLs
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'true').lower() == 'true'

    # Rate limiting settings for share link access
    SHARE_LINK_RATE_LIMIT = {
        'attempts': 5,  # Max failed attempts
        'period': 60,  # Time period in minutes
        'lockout': 30   # Lockout time in minutes
    }

    # Usage limits per subscription plan
    # Limits are lifetime (no reset) and apply separately to docs and chat
    # Structure: plan_name -> feature_type -> limit_value
    # Use None for unlimited
    PLAN_USAGE_LIMITS = {
        'Basic': {
            'docs': 50,      # 50 document generations
            'chat': 100      # 100 chat queries
        },
        'Premium': {
            'docs': 250,     # 500 document generations
            'chat': 1000     # 1000 chat queries
        },
        'none': {
            # Users with no subscription no access
            'docs': 0,
            'chat': 0
        }
    }
# Create a config instance
config = Config()