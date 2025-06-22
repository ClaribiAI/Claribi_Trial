import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Application settings
class Config:
    FRONTEND_URL = 'https://localhost:5173'
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')  # Default from __init__.py
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Security configurations
    SESSION_COOKIE_SECURE = False  # Ensure cookies are only sent over HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    REMEMBER_COOKIE_SECURE = False  # Ensure remember token is only sent over HTTPS
    PERMANENT_SESSION_LIFETIME = 3600 #1 hour
    SESSION_COOKIE_SAMESITE = 'Lax'

    # File validation settings
    ALLOWED_EXTENSIONS = {'tmdl'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # Database settings
    DATABASE_URL = os.getenv('DATABASE_URL')  # Direct connection string for Neon PostgreSQL
    # Authenticated database URL for Neon PostgreSQL with JWT auth
    #DATABASE_AUTHENTICATED_URL = os.getenv('DATABASE_AUTHENTICATED_URL')
    #NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL = os.getenv('NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL')
    # Ensure sslmode=require is in the DATABASE_URL for Neon PostgreSQL
    if DATABASE_URL and 'neon.tech' in DATABASE_URL and 'sslmode=' not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require" if "?" not in DATABASE_URL else "&sslmode=require"
    
    POSTGRES_HOST = os.getenv('POSTGRES_HOST')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
    POSTGRES_DB = os.getenv('POSTGRES_DB')
    POSTGRES_USER = os.getenv('POSTGRES_USER')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
    POSTGRES_SSLMODE = os.getenv('POSTGRES_SSLMODE', 'require')  # Default to require SSL
    
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
    
    # API settings
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

    # Microsoft AD Authentication Settings
    MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
    MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
    MICROSOFT_TENANT_ID = os.getenv('MICROSOFT_TENANT_ID')  # For multi-tenant apps
    MICROSOFT_REDIRECT_URI = os.getenv('MICROSOFT_REDIRECT_URI', 'https://localhost:5000/auth/callback')
    MICROSOFT_AUTHORITY = os.getenv('MICROSOFT_AUTHORITY', f'https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}')
    MICROSOFT_SCOPE = os.getenv("MICROSOFT_SCOPE") 

    # Redis Configuration for Token Storage
    REDIS_HOST = os.getenv('REDIS_HOST')
    REDIS_PORT = int(os.getenv('REDIS_PORT'))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')
    REDIS_SSL = os.getenv('REDIS_SSL', 'True').lower() == 'true'
    REDIS_SSL_CERT_REQS = os.getenv('REDIS_SSL_CERT_REQS', 'required')
    
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
# Create a config instance
config = Config()