"""
Token Service

This module provides secure token generation, validation, and management services
for project sharing and other secure operations in the application.
"""

from flask import current_app, request
import logging
import secrets
import jwt
import hashlib
import os
from datetime import datetime, timedelta
from app.auth.token.encryption import EncryptionService
from app.models.project_access import AccessTypeEnum
import redis
import json

logger = logging.getLogger(__name__)

class TokenService:
    """Service for token generation, validation, and management"""
    
    # Token cache
    _token_cache = {}
    _redis_client = None
    
    @classmethod
    def _get_redis_client(cls):
        """Get or initialize Redis client for token caching"""
        if cls._redis_client is None:
            try:
                host = current_app.config.get('REDIS_HOST', 'localhost')
                port = current_app.config.get('REDIS_PORT', 6379)
                password = current_app.config.get('REDIS_PASSWORD', None)
                db = current_app.config.get('REDIS_TOKEN_DB', 0)
                
                cls._redis_client = redis.Redis(
                    host=host,
                    port=port,
                    password=password,
                    db=db,
                    decode_responses=True
                )
                return cls._redis_client
            except Exception as e:
                logger.error(f"Error connecting to Redis: {str(e)}")
                return None
        return cls._redis_client
    
    @staticmethod
    def encrypt_token(token):
        """Encrypt a token using the encryption service
        
        Args:
            token: The token to encrypt
            
        Returns:
            str: Encrypted token
        """
        return EncryptionService.encrypt_data(token)

    @staticmethod
    def decrypt_token(encrypted_token):
        """Decrypt a token using the encryption service
        
        Args:
            encrypted_token: The encrypted token
            
        Returns:
            str: Decrypted token
        """
        return EncryptionService.decrypt_data(encrypted_token)

    @classmethod
    def generate_share_token(cls, project_id, user_id, expiration_hours=24):
        """Generate a secure token for project sharing with appropriate claims
        
        Args:
            project_id: Project ID for the token
            user_id: User ID of token creator
            expiration_hours: Hours until expiration
            
        Returns:
            tuple: (token, expires_at) - token string and expiration datetime
        """
        try:
            # Convert expiration_hours to int if it's a string
            if expiration_hours is not None and isinstance(expiration_hours, str):
                try:
                    expiration_hours = int(expiration_hours)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid expiration_hours value: {expiration_hours}, defaulting to 24")
                    expiration_hours = 24
            
            # Ensure expiration is set
            if expiration_hours is None or expiration_hours <= 0:
                expiration_hours = 24  # Default to 24 hours
                
            # Calculate expiration time
            expires_at = datetime.utcnow() + timedelta(hours=expiration_hours)
            
            # Generate additional entropy with salt
            random_key = secrets.token_urlsafe(16)
            salt = os.urandom(16).hex()
            entropy = os.urandom(16).hex()
            
            # Create a composite fingerprint with user agent and timestamp
            user_agent = request.user_agent.string if request and hasattr(request, 'user_agent') else None
            
            # Generate device fingerprint for additional security
            fingerprint = hashlib.sha256(
                (str(datetime.utcnow().timestamp()) + 
                 (user_agent or '') + 
                 salt).encode()
            ).hexdigest()
            
            # Create a token ID that is collision-resistant
            token_id = secrets.token_hex(16)
            
            # Create JWT payload with all necessary claims
            payload = {
                'project_id': int(project_id),  # Ensure project_id is an integer
                'created_by': str(user_id),     # Ensure user_id is a string
                'random': random_key,           # Add randomness
                'entropy': entropy,             # Additional entropy
                'salt': salt,                   # Add salt for additional security
                'fingerprint': fingerprint,     # Device/time fingerprint
                'exp': expires_at.timestamp(),  # Expiration timestamp
                'iat': datetime.utcnow().timestamp(),  # Issued at timestamp
                'nbf': datetime.utcnow().timestamp(),  # Not valid before timestamp
                'jti': token_id                 # Unique token ID to prevent reuse
            }
            
            # Sign the token with appropriate algorithms
            algorithm = 'HS256'  # Use HS256 as the default algorithm
            token = jwt.encode(
                payload,
                current_app.config['SECRET_KEY'],
                algorithm=algorithm
            )
            
            # Ensure token is a string
            if isinstance(token, bytes):
                token = token.decode('utf-8')
            
            # Store token in cache/Redis for quick validation and revocation
            cls._cache_token(token_id, {
                'token': token,
                'project_id': project_id,
                'user_id': user_id,
                'expires_at': expires_at.isoformat(),
                'revoked': False
            }, expiration_hours * 3600)  # Cache for token lifetime
            
            return token, expires_at
        except Exception as e:
            logger.error(f"Error generating share token: {str(e)}")
            return None, None

    @classmethod
    def validate_share_token(cls, token):
        """Validate a share token and extract claims
        
        Args:
            token: The token to validate
            
        Returns:
            tuple: (project_id, error_message) - project ID and optional error
        """
        try:
            # Set verification options - enforce all security checks
            options = {
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": True,
                "require": ["exp", "iat", "nbf", "project_id", "salt", "fingerprint", "jti"]
            }
            
            # Add leeway for clock skew (30 seconds)
            leeway = 30
            
            # Use consistent algorithm for token validation
            algorithms = ['HS256', 'HS384', 'HS512']
            
            # Decode without verification first to get the token ID
            unverified_payload = jwt.decode(
                token, 
                options={"verify_signature": False},
                algorithms=algorithms
            )
            
            # Check if token is in blacklist/revoked
            token_id = unverified_payload.get('jti')
            if token_id and cls._is_token_revoked(token_id):
                return None, "Token has been revoked"
            
            # Decode and verify the token
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=algorithms,
                options=options,
                leeway=leeway
            )
            
            # Extract and validate required claims
            project_id = payload.get('project_id')
            if not project_id:
                return None, "Invalid token format: missing project_id"
            
            created_by = payload.get('created_by')
            if not created_by:
                return None, "Invalid token format: missing creator information"
            
            # Verify salt and fingerprint exist
            if not payload.get('salt') or not payload.get('fingerprint'):
                return None, "Invalid token: missing security components"
            
            return project_id, None
        except jwt.ExpiredSignatureError:
            return None, "Token has expired"
        except jwt.InvalidTokenError as e:
            return None, f"Invalid token: {str(e)}"
        except Exception as e:
            logger.error(f"Error validating share token: {str(e)}")
            return None, "Token validation error"

    @classmethod
    def create_share_link_object(cls, project_id, user_id, token, expires_at, access_type=AccessTypeEnum.co_owner.value):
        """Create a share link object with encrypted token
        
        Args:
            project_id: Project ID for the share link
            user_id: User ID creating the share link
            token: The token to encrypt and store
            expires_at: Expiration datetime
            access_type: Type of access to grant (co_owner or reader)
            
        Returns:
            dict: Share link object with encrypted token
        """
        try:
            # Encrypt the token for storage
            encrypted_token = cls.encrypt_token(token)
            if not encrypted_token:
                return None
            
            # Create dictionary with share link data
            share_link = {
                'project_id': int(project_id),
                'created_by_user_id': str(user_id),
                'encrypted_token': encrypted_token,
                'expires_at': expires_at,
                'is_revoked': False,
                'created_at': datetime.utcnow(),
                'access_type': access_type
            }
            
            return share_link
        except Exception as e:
            logger.error(f"Error creating share link object: {str(e)}")
            return None
    
    @classmethod
    def revoke_token(cls, token_or_id):
        """Revoke a token to prevent future use
        
        Args:
            token_or_id: Token string or token ID to revoke
            
        Returns:
            bool: True if revoked successfully
        """
        try:
            # If full token provided, extract ID
            if len(token_or_id) > 32:  # This is a full token
                try:
                    unverified_payload = jwt.decode(
                        token_or_id, 
                        options={"verify_signature": False},
                        algorithms=['HS256', 'HS384', 'HS512']
                    )
                    token_id = unverified_payload.get('jti')
                except:
                    logger.error("Could not extract token ID from token")
                    return False
            else:
                token_id = token_or_id
                
            # Revoke in Redis
            redis_client = cls._get_redis_client()
            if redis_client:
                try:
                    # Update token data with revoked flag
                    token_key = f"token:{token_id}"
                    token_data = redis_client.get(token_key)
                    
                    if token_data:
                        token_data = json.loads(token_data)
                        token_data['revoked'] = True
                        redis_client.set(
                            token_key, 
                            json.dumps(token_data),
                            ex=redis_client.ttl(token_key)
                        )
                    
                    # Also add to revocation set with exp time equal to token exp time
                    redis_client.set(f"revoked:{token_id}", "1", ex=86400*30)  # 30 days
                    return True
                except Exception as e:
                    logger.error(f"Redis error while revoking token: {str(e)}")
            
            # Update in-memory cache if Redis not available
            cls._token_cache[token_id] = {'revoked': True}
            return True
        except Exception as e:
            logger.error(f"Error revoking token: {str(e)}")
            return False
    
    @classmethod
    def _cache_token(cls, token_id, token_data, expiration):
        """Cache token data in Redis and/or memory
        
        Args:
            token_id: Unique token identifier
            token_data: Token data to cache
            expiration: Cache expiration in seconds
        """
        # Store in Redis if available
        redis_client = cls._get_redis_client()
        if redis_client:
            try:
                redis_client.set(
                    f"token:{token_id}", 
                    json.dumps(token_data),
                    ex=expiration
                )
                return
            except Exception as e:
                logger.error(f"Redis error while caching token: {str(e)}")
        
        # Fallback to in-memory cache
        cls._token_cache[token_id] = token_data
    
    @classmethod
    def _is_token_revoked(cls, token_id):
        """Check if a token has been revoked
        
        Args:
            token_id: Token ID to check
            
        Returns:
            bool: True if token is revoked
        """
        # Check Redis first if available
        redis_client = cls._get_redis_client()
        if redis_client:
            try:
                # Check direct revocation flag
                if redis_client.exists(f"revoked:{token_id}"):
                    return True
                
                # Check token data
                token_data = redis_client.get(f"token:{token_id}")
                if token_data:
                    token_data = json.loads(token_data)
                    return token_data.get('revoked', False)
                    
                return False
            except Exception as e:
                logger.error(f"Redis error while checking token revocation: {str(e)}")
        
        # Fall back to in-memory cache
        token_data = cls._token_cache.get(token_id, {})
        return token_data.get('revoked', False)

    @classmethod
    def extract_project_id_from_token(cls, token):
        """Extract project ID from token without full validation
        
        Args:
            token: The token to extract project ID from
            
        Returns:
            int: Project ID or None if extraction fails
        """
        try:
            # Decode without verification to get project_id
            unverified_payload = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=['HS256', 'HS384', 'HS512']
            )
            
            project_id = unverified_payload.get('project_id')
            return int(project_id) if project_id else None
        except Exception as e:
            logger.warning(f"Could not extract project_id from token: {str(e)}")
            return None