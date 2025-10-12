"""
JWT Service for Simplified Authentication

This service handles JWT token creation and validation for the simplified
authentication approach using Graph API.
"""
import jwt
import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from app.config.settings import config

logger = logging.getLogger(__name__)

class JWTService:
    """
    Service for handling JWT tokens in the simplified authentication flow.
    """
    
    @staticmethod
    def create_user_token(user_data: Dict[str, Any], secret_key: str = None) -> str:
        """
        Create a JWT token with user data.
        
        Args:
            user_data: User data from Graph API
            secret_key: Secret key for signing (defaults to config.SECRET_KEY)
            
        Returns:
            JWT token string
        """
        if secret_key is None:
            secret_key = config.SECRET_KEY
        
        # Set token expiration (1 hour)
        exp_time = datetime.utcnow() + timedelta(hours=1)
        
        payload = {
            'user_id': user_data.get('ms_object_id'),
            'organization_id': user_data.get('organization_id'),
            'display_id': user_data.get('display_id'),
            'role': user_data.get('role'),
            'exp': exp_time,
            'iat': datetime.utcnow(),
            'iss': 'claribi-auth',  # Issuer
            'sub': user_data.get('ms_object_id'),  # Subject (user ID)
            'aud': 'claribi-app'  # Audience
        }
        
        try:
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            logger.info(f"JWT token created for user: {user_data.get('display_id')}")
            return token
        except Exception as e:
            logger.error(f"Error creating JWT token: {e}")
            raise
    
    @staticmethod
    def validate_user_token(token: str, secret_key: str = None) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token and return user data.
        
        Args:
            token: JWT token string
            secret_key: Secret key for verification (defaults to config.SECRET_KEY)
            
        Returns:
            User data if valid, None if invalid
        """
        if secret_key is None:
            secret_key = config.SECRET_KEY
        
        try:
            payload = jwt.decode(
                token, 
                secret_key, 
                algorithms=['HS256'],
                audience='claribi-app',
                issuer='claribi-auth'
            )
            
            user_data = {
                'ms_object_id': payload.get('user_id'),
                'organization_id': payload.get('organization_id'),
                'display_id': payload.get('display_id'),
                'role': payload.get('role'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat')
            }
            
            logger.info(f"JWT token validated for user: {user_data.get('display_id')}")
            return user_data
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error validating JWT token: {e}")
            return None
    
    @staticmethod
    def is_token_expired(token: str, secret_key: str = None) -> bool:
        """
        Check if a JWT token is expired without validating the signature.
        
        Args:
            token: JWT token string
            secret_key: Secret key (not used, but kept for consistency)
            
        Returns:
            True if expired, False if still valid
        """
        try:
            # Decode without verification to check expiration
            payload = jwt.decode(token, options={"verify_signature": False})
            exp_time = payload.get('exp')
            if exp_time:
                return datetime.utcnow().timestamp() > exp_time
            return True  # No expiration time means expired
        except Exception:
            return True  # Invalid token means expired
    
    @staticmethod
    def get_token_info(token: str) -> Optional[Dict[str, Any]]:
        """
        Get token information without validating signature.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload if valid format, None if invalid
        """
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return {
                'user_id': payload.get('user_id'),
                'organization_id': payload.get('organization_id'),
                'display_id': payload.get('display_id'),
                'role': payload.get('role'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat'),
                'iss': payload.get('iss'),
                'aud': payload.get('aud')
            }
        except Exception as e:
            logger.warning(f"Error getting token info: {e}")
            return None
    
    @staticmethod
    def refresh_token_if_needed(token: str, secret_key: str = None) -> Tuple[bool, Optional[str]]:
        """
        Check if token needs refresh and return new token if needed.
        
        Args:
            token: Current JWT token
            secret_key: Secret key for token creation
            
        Returns:
            Tuple of (needs_refresh, new_token)
        """
        if secret_key is None:
            secret_key = config.SECRET_KEY
        
        # Check if token is expired or will expire soon (within 5 minutes)
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            exp_time = payload.get('exp')
            if exp_time:
                time_until_expiry = exp_time - datetime.utcnow().timestamp()
                # Refresh if expires within 5 minutes
                if time_until_expiry < 300:  # 5 minutes
                    logger.info("Token needs refresh - expires soon")
                    return True, None  # Needs refresh but can't create new token here
            return False, None
        except Exception:
            return True, None  # Invalid token needs refresh
