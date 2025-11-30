"""
JWT Service for Simplified Authentication

This service handles JWT token creation and validation for the simplified
authentication approach using Graph API.
"""
import jwt
import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from app.config.settings import config

logger = logging.getLogger(__name__)

class JWTService:
    """
    Service for handling JWT tokens in the simplified authentication flow.
    """
    
    @staticmethod
    def create_user_token(user_data: Dict[str, Any], secret_key: str = None) -> Tuple[str, str]:
        """
        Create a JWT access token and refresh token with user data.
        
        Args:
            user_data: User data from Graph API
            secret_key: Secret key for signing (defaults to config.SECRET_KEY)
            
        Returns:
            Tuple of (access_token, refresh_token)
        """
        if secret_key is None:
            secret_key = config.SECRET_KEY
        
        # Get current UTC time as integer timestamp (seconds since epoch)
        now = datetime.now(timezone.utc)
        now_timestamp = int(now.timestamp())
        
        # Set access token expiration (1 hour) as integer timestamp
        access_exp_timestamp = int((now + timedelta(hours=1)).timestamp())
        
        # Set refresh token expiration (7 days) as integer timestamp
        refresh_exp_timestamp = int((now + timedelta(days=7)).timestamp())
        
        # Helper function to convert UUID objects to strings
        def convert_uuid_to_string(value):
            if hasattr(value, 'hex'):  # UUID object
                return str(value)
            return value
        
        # Create access token payload with UUID conversion
        access_payload = {
            'user_id': convert_uuid_to_string(user_data.get('ms_object_id')),
            'exp': access_exp_timestamp,  # Integer timestamp (seconds since epoch)
            'iat': now_timestamp,  # Integer timestamp (seconds since epoch)
            'iss': 'claribi-auth',  # Issuer
            'sub': convert_uuid_to_string(user_data.get('ms_object_id')),  # Subject (user ID)
            'aud': 'claribi-app',  # Audience
            'type': 'access'  # Token type
        }
        
        # Create refresh token payload with UUID conversion
        refresh_payload = {
            'user_id': convert_uuid_to_string(user_data.get('ms_object_id')),
            'exp': refresh_exp_timestamp,  # Integer timestamp (seconds since epoch)
            'iat': now_timestamp,  # Integer timestamp (seconds since epoch)
            'iss': 'claribi-auth',
            'sub': convert_uuid_to_string(user_data.get('ms_object_id')),
            'aud': 'claribi-app',
            'type': 'refresh'  # Token type
        }
        
        try:
            access_token = jwt.encode(access_payload, secret_key, algorithm='HS256')
            refresh_token = jwt.encode(refresh_payload, secret_key, algorithm='HS256')
            # Only log token creation in debug mode to reduce log spam
            logger.debug(f"JWT tokens created for user: {user_data.get('ms_object_id')}")
            return access_token, refresh_token
        except Exception as e:
            logger.error(f"Error creating JWT tokens: {e}")
            raise
    
    @staticmethod
    def validate_user_token(token: str, secret_key: str = None) -> Optional[Dict[str, Any]]:
        """
        Validate JWT access token and return user data.
        
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
            
            # Check if this is an access token
            token_type = payload.get('type')
            if token_type != 'access':
                logger.warning(f"Invalid token type: {token_type}")
                return None
            
            user_data = {
                'ms_object_id': payload.get('user_id'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat')
            }
            
            # Only log validation in debug mode to reduce log spam
            logger.debug(f"JWT access token validated for user: {user_data.get('ms_object_id')}")
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
    def validate_refresh_token(token: str, secret_key: str = None) -> Optional[Dict[str, Any]]:
        """
        Validate JWT refresh token and return user data.
        
        Args:
            token: JWT refresh token string
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
            
            # Check if this is a refresh token
            token_type = payload.get('type')
            if token_type != 'refresh':
                logger.warning(f"Invalid token type for refresh: {token_type}")
                return None
            
            user_data = {
                'ms_object_id': payload.get('user_id'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat')
            }
            
            # Only log validation in debug mode to reduce log spam
            logger.debug(f"JWT refresh token validated for user: {payload.get('user_id')}")
            return user_data
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT refresh token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT refresh token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error validating JWT refresh token: {e}")
            return None
    
    @staticmethod
    def refresh_access_token(refresh_token: str, secret_key: str = None) -> Optional[Tuple[str, str]]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            secret_key: Secret key for token creation
            
        Returns:
            Tuple of (new_access_token, new_refresh_token) if successful, None if failed
        """
        if secret_key is None:
            secret_key = config.SECRET_KEY
        
        # Validate refresh token
        user_data = JWTService.validate_refresh_token(refresh_token, secret_key)
        if not user_data:
            return None
        
        # Get full user data from database
        from app.auth2.services import UserService
        full_user_data = UserService.get_user_by_ms_object_id(user_data['ms_object_id'])
        if not full_user_data:
            logger.warning(f"User not found in database: {user_data['ms_object_id']}")
            return None
        
        # Create new token pair
        try:
            new_access_token, new_refresh_token = JWTService.create_user_token(full_user_data, secret_key)
            # Only log token refresh in debug mode to reduce log spam
            logger.debug(f"Tokens refreshed for user: {full_user_data.get('ms_object_id')}")
            return new_access_token, new_refresh_token
        except Exception as e:
            logger.error(f"Error refreshing tokens: {e}")
            return None
