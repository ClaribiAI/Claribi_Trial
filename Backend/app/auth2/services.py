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
from app.auth2.graphapi import validate_token, get_user_info_from_token, get_user_groups_from_token

auth2_config = Auth2Config()

logger = logging.getLogger(__name__)

# Note: Auth flows are no longer stored in memory for Railway compatibility

class MSALService:
    """
    Service class for Microsoft Authentication Library operations.
    Handles token acquisition, caching, and MSAL app initialization.
    """
    
    @staticmethod
    def build_msal_app(cache: msal.SerializableTokenCache = None) -> msal.ConfidentialClientApplication:
        """Build MSAL application instance"""
        try:
            app = msal.ConfidentialClientApplication(
                auth2_config.MSAL_CLIENT_ID,
                authority=auth2_config.MSAL_AUTHORITY,
                client_credential=auth2_config.MSAL_CLIENT_SECRET,
                token_cache=cache
            )
            return app
        except Exception as e:
            logger.error(f"Failed to create MSAL ConfidentialClientApplication: {e}")
            raise
    
    @staticmethod
    def build_public_msal_app(cache: msal.SerializableTokenCache = None) -> msal.PublicClientApplication:
        """Build MSAL public client application instance for PKCE"""
        return msal.PublicClientApplication(
            auth2_config.MSAL_CLIENT_ID,
            authority=auth2_config.MSAL_AUTHORITY,
            token_cache=cache
        )
    
    @staticmethod
    def get_token_cache() -> msal.SerializableTokenCache:
        """Get token cache - simplified for JWT approach"""
        # For JWT approach, we don't need persistent token caching
        # Just return a fresh cache for the current request
        return msal.SerializableTokenCache()
    
    @staticmethod
    def save_token_cache(cache: msal.SerializableTokenCache) -> None:
        """Save token cache - simplified for JWT approach"""
        # For JWT approach, we don't need to persist token cache
        # The JWT token contains all necessary user information
        pass
    
    @staticmethod
    def get_redirect_uri() -> str:
        """Get the redirect URI for MSAL - use frontend URL for Azure AD compatibility"""
        # Use frontend URL as redirect URI since that's what's configured in Azure AD
        frontend_url = os.environ.get('FRONTEND_URL', 'https://localhost:5173')
        redirect_uri = f"{frontend_url.rstrip('/')}{auth2_config.MSAL_REDIRECT_PATH}"
        return redirect_uri
    
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
    def initiate_auth_flow_with_state(state: str, scopes: list = None) -> dict:
        """Initiate MSAL authentication flow with state parameter using confidential client"""
        if scopes is None:
            scopes = auth2_config.MSAL_SCOPES
            
        # For Railway deployment, we don't store auth flows in memory
        # Instead, we use direct token acquisition in the callback
        try:
            app = MSALService.build_msal_app()
            auth_flow = app.initiate_auth_code_flow(
                scopes=scopes,
                redirect_uri=MSALService.get_redirect_uri(),
                state=state
            )
        except Exception as e:
            logger.error(f"Auth flow initiation failed: {e}")
            # Fallback to basic auth flow
            try:
                auth_flow = MSALService.build_msal_app().initiate_auth_code_flow(
                    scopes=scopes,
                    redirect_uri=MSALService.get_redirect_uri()
                )
            except Exception as fallback_e:
                logger.error(f"Fallback auth flow also failed: {fallback_e}")
                raise
        
        return auth_flow
    
    
    @staticmethod
    def acquire_token_by_auth_code_direct(request_args: dict, code_verifier: str = None, nonce: str = None) -> dict:
        """Acquire token using authorization code directly with PKCE code_verifier and nonce"""
        cache = MSALService.get_token_cache()
        app = MSALService.build_msal_app(cache=cache)
        
        # Get the authorization code and state from request args
        auth_code = request_args.get('code')
        state = request_args.get('state', '')
        
        if not auth_code:
            logger.error("No authorization code provided")
            return {"error": "authorization_code_missing", "error_description": "No authorization code provided"}
        
        try:
            if code_verifier:
                # For ConfidentialClientApplication with PKCE, reconstruct the auth flow
                auth_flow = {
                    'code_verifier': code_verifier,
                    'redirect_uri': MSALService.get_redirect_uri(),
                    'scope': auth2_config.MSAL_SCOPES,
                    'state': state if state else '',
                    'nonce': nonce if nonce else '',
                    'claims_challenge': ''
                }
                
                # Use acquire_token_by_auth_code_flow with the auth flow
                result = app.acquire_token_by_auth_code_flow(
                    auth_flow, 
                    request_args
                )
            else:
                # Fallback to standard authorization code flow
                result = app.acquire_token_by_authorization_code(
                    auth_code,
                    scopes=auth2_config.MSAL_SCOPES,
                    redirect_uri=MSALService.get_redirect_uri()
                )
            
            if 'error' in result:
                logger.error(f"Token acquisition error: {result.get('error')} - {result.get('error_description')}")
            
            MSALService.save_token_cache(cache)
            return result
            
        except Exception as e:
            logger.error(f"Exception during token acquisition: {e}")
            return {
                "error": "token_acquisition_exception",
                "error_description": f"Exception during token acquisition: {str(e)}"
            }
    
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
    

    @staticmethod
    def clear_session() -> None:
        """Clear user session data"""
        # Clear only auth-related session data
        session.pop('user', None)
        session.pop('token_cache', None)
        session.modified = True

class GraphService:
    """Service class for Microsoft Graph API operations using Graph API flow"""
    
    @staticmethod
    def get_user_profile(access_token: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Microsoft Graph API using Graph API functions"""
        try:
            success, user_id, email, user_data = get_user_info_from_token(access_token)
            if success and user_data:
                return user_data
            else:
                logger.error("Failed to get user profile from Graph API")
                return None
                
        except Exception as e:
            logger.error(f"Unexpected error in Graph API call: {e}")
            return None
    
    @staticmethod
    def validate_user_token(access_token: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Validate user token using Graph API"""
        try:
            return validate_token(access_token)
        except Exception as e:
            logger.error(f"Error validating token: {e}")
            return False, None
    
    @staticmethod
    def get_user_groups(access_token: str) -> set:
        """Get user groups from token using Graph API functions"""
        try:
            return get_user_groups_from_token(access_token)
        except Exception as e:
            logger.error(f"Error getting user groups: {e}")
            return set() 