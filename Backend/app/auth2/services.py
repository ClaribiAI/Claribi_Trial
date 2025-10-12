"""
Auth2 Services Module

Core service classes for authentication, user management, and security.
"""
import logging
import os
import msal
import requests
from typing import Optional, Dict, Any, Tuple, List
from flask import session, request
from app.core.database import get_db_cursor
from app.auth2.config import Auth2Config

auth2_config = Auth2Config()

logger = logging.getLogger(__name__)

class MSALService:
    """
    Service class for Microsoft Authentication Library operations.
    Handles token acquisition, caching, and MSAL app initialization.
    """
    
    @staticmethod
    def build_msal_app(cache: msal.SerializableTokenCache = None) -> msal.ConfidentialClientApplication:
        """Build MSAL application instance"""
        return msal.ConfidentialClientApplication(
            auth2_config.MSAL_CLIENT_ID,
            authority=auth2_config.MSAL_AUTHORITY,
            client_credential=auth2_config.MSAL_CLIENT_SECRET,
            token_cache=cache
        )
    
    @staticmethod
    def get_token_cache() -> msal.SerializableTokenCache:
        """Get token cache from session"""
        cache = msal.SerializableTokenCache()
        if session.get("token_cache"):
            cache.deserialize(session["token_cache"])
        return cache
    
    @staticmethod
    def save_token_cache(cache: msal.SerializableTokenCache) -> None:
        """Save token cache to session"""
        if cache.has_state_changed:
            session["token_cache"] = cache.serialize()
    
    @staticmethod
    def get_redirect_uri() -> str:
        """Get the redirect URI for MSAL"""
        # Check if request came through Vite proxy (has localhost origin)
        origin = request.headers.get('Origin', '')
        referer = request.headers.get('Referer', '')
        
        # If request came from localhost:5173 (Vite proxy), use proxy for callback too
        if 'localhost:5173' in origin or 'localhost:5173' in referer:
            return f"https://localhost:5173{auth2_config.MSAL_REDIRECT_PATH}"
        else:
            # Use environment variable for production redirect URI
            backend_url = os.environ.get('BACKEND_URL')
            if backend_url:
                # Ensure HTTPS for production
                if backend_url.startswith('http://') and 'localhost' not in backend_url:
                    backend_url = backend_url.replace('http://', 'https://')
                return f"{backend_url.rstrip('/')}{auth2_config.MSAL_REDIRECT_PATH}"
            else:
                # Fallback to request URL but force HTTPS in production
                base_url = request.url_root.rstrip('/')
                if not base_url.startswith('https://') and 'localhost' not in base_url:
                    base_url = base_url.replace('http://', 'https://')
                return f"{base_url}{auth2_config.MSAL_REDIRECT_PATH}"
    
    @staticmethod
    def initiate_auth_flow(scopes: list = None) -> dict:
        """Initiate MSAL authentication flow"""
        if scopes is None:
            scopes = auth2_config.MSAL_SCOPES
            
        return MSALService.build_msal_app().initiate_auth_code_flow(
            scopes=scopes,
            redirect_uri=MSALService.get_redirect_uri()
        )
    
    @staticmethod
    def acquire_token_by_auth_code(auth_flow: dict, request_args: dict) -> dict:
        """Acquire token using authorization code"""
        cache = MSALService.get_token_cache()
        result = MSALService.build_msal_app(cache=cache).acquire_token_by_auth_code_flow(
            auth_flow, request_args
        )
        MSALService.save_token_cache(cache)
       # logger.info(f"Token acquired: {result}")# for debugging
        return result
    
    @staticmethod
    def acquire_token_silent(scopes: list = None) -> Optional[dict]:
        """Acquire token silently using cached credentials"""
        if scopes is None:
            scopes = auth2_config.MSAL_SCOPES
            
        cache = MSALService.get_token_cache()
        accounts = MSALService.build_msal_app(cache=cache).get_accounts()
        
        if not accounts:
            return None
            
        result = MSALService.build_msal_app(cache=cache).acquire_token_silent(
            scopes=scopes,
            account=accounts[0]
        )
        MSALService.save_token_cache(cache)
        return result

class UserService:
    """Service class for user management operations"""
    
    @staticmethod
    def create_or_update_user(ms_object_id: str, organization_id: str, display_id: str, role: str = None) -> Tuple[bool, Optional[str]]:
        """Create or update user in database with role information"""
        try:
            with get_db_cursor(commit=True) as cursor:
                # Check if user exists
                cursor.execute(
                    "SELECT id FROM users WHERE ms_object_id = %s",
                    (ms_object_id,)
                )
                existing_user = cursor.fetchone()
                
                if existing_user:
                    # Update existing user including role
                    cursor.execute(
                        """UPDATE users 
                           SET organization_id = %s, display_id = %s, role = %s
                           WHERE ms_object_id = %s""",
                        (organization_id, display_id, role, ms_object_id)
                    )
                else:
                    # Create new user with role
                    cursor.execute(
                        """INSERT INTO users (ms_object_id, organization_id, display_id, role, created_at) 
                           VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)""",
                        (ms_object_id, organization_id, display_id, role)
                    )
                
                return True, None
                
        except Exception as e:
            logger.error(f"Database error in create_or_update_user: {e}")
            return False, str(e)
    
    @staticmethod
    def get_user_by_ms_object_id(ms_object_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Microsoft Object ID"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """SELECT id, ms_object_id, organization_id, display_id, role, created_at
                       FROM users WHERE ms_object_id = %s""",
                    (ms_object_id,)
                )
                user_data = cursor.fetchone()
                
                if user_data:
                    return {
                        'id': user_data[0],
                        'ms_object_id': user_data[1],
                        'organization_id': user_data[2],
                        'display_id': user_data[3],
                        'role': user_data[4],
                        'created_at': user_data[5]
                    }
        except Exception as e:
            logger.error(f"Database error in get_user_by_ms_object_id: {e}")
        
        return None

    @staticmethod
    def is_organization_allowed(organization_id: str) -> bool:
        """Check if an organization is allowed based on the allowed_organizations table"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM allowed_organizations WHERE org_id = %s",
                    (organization_id,)
                )
                result = cursor.fetchone()
                return result is not None
        except Exception as e:
            logger.error(f"Database error in is_organization_allowed: {e}")
            return False

class SecurityService:
    """Service class for security-related operations"""
    
    @staticmethod
    def validate_app_role(role: str) -> bool:
        """Validate if the role is one of the allowed app roles"""
        return role in auth2_config.VALID_APP_ROLES
    
    @staticmethod
    def extract_app_roles_from_token(id_token_claims: Dict[str, Any]) -> List[str]:
        """
        Extract and validate app roles from ID token claims.
        
        Args:
            id_token_claims: The claims from the ID token
            
        Returns:
            List of valid app roles assigned to the user
        """
        try:
            # The roles claim contains the app roles assigned to the user
            roles_claim = id_token_claims.get('roles', [])
            #logger.info(f"Roles claim: {roles_claim}")# for debugging
            # Ensure roles_claim is a list 
            if not isinstance(roles_claim, list):
                logger.warning(f"Roles claim is not a list: {roles_claim}")
                return []
            
            # Filter and validate roles
            valid_roles = []
            for role in roles_claim:
                if isinstance(role, str) and SecurityService.validate_app_role(role):
                    valid_roles.append(role)
                else:
                    logger.info(f"Ignoring invalid or unrecognized role: {role}")
            
            logger.info(f"Extracted valid app roles from token: {valid_roles}")
            return valid_roles
            
        except Exception as e:
            logger.error(f"Error extracting app roles from token: {e}")
            return []
    
    # @staticmethod
    # def generate_session_token() -> str:
    #     """Generate a secure session token"""
    #     import secrets
    #     return secrets.token_urlsafe(32)
    
    # @staticmethod
    # def hash_token(token: str) -> str:
    #     """Hash a token for secure storage"""
    #     import hashlib
    #     return hashlib.sha256(token.encode()).hexdigest()
    
    # @staticmethod
    # def verify_token_hash(token: str, token_hash: str) -> bool:
    #     """Verify a token against its hash"""
    #     import hashlib
    #     return hashlib.sha256(token.encode()).hexdigest() == token_hash
    
    # @staticmethod
    # def is_token_expired(expires_at: int) -> bool:
    #     """Check if a token has expired"""
    #     import time
    #     return time.time() > expires_at

    @staticmethod
    def clear_session() -> None:
        """Clear user session data"""
        session.clear()
        session.modified = True

class GraphService:
    """Service class for Microsoft Graph API operations"""
    
    @staticmethod
    def get_user_profile(access_token: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Microsoft Graph API"""
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            graph_endpoint = 'https://graph.microsoft.com/v1.0/me'
            
            response = requests.get(graph_endpoint, headers=headers, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Graph API call failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in Graph API call: {e}")
            return None 