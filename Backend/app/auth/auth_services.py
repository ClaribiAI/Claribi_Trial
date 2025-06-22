import msal
import datetime
import jwt
from flask import redirect, session, url_for, current_app, g
from app.database.connection import get_db
from app.models.users import User
from redis import Redis
from app.auth.token_storage import RedisTokenStorage
import uuid
#The scopes maybe needs to be hardcoded in .env or .config, but it was giving errors so it was kept here for now
scopes = ['https://graph.microsoft.com/.default']
def initiate_auth_flow():
    """Start the Microsoft AD authentication flow"""
    # Generate and store a nonce in the session to prevent CSRF attacks
    state = str(uuid.uuid4())
    session["state"] = state
    current_app.logger.info(f"Generated new state token: {state}")
    
    try:
        # Create MSAL app instance
        msal_app = _get_msal_app()
        
        # Get auth URL
        auth_url = msal_app.get_authorization_request_url(
            scopes=scopes,
            state=state,
            redirect_uri=current_app.config['MICROSOFT_REDIRECT_URI']
        )
        
        # Ensure session is saved immediately
        session.modified = True
        
        return redirect(auth_url)
    except Exception as e:
        import traceback
        print("ERROR in initiate_auth_flow:", str(e))
        print(traceback.format_exc())
        raise

def process_auth_callback(args):
    """Process the callback from Microsoft AD"""
    # Sanitize args before logging
    safe_args = {k: '***' if k in ['code', 'id_token'] else v for k, v in args.items()}
    current_app.logger.debug(f"Received auth callback with args: {safe_args}")
    current_app.logger.debug(f"Session at callback: {dict(session)}")
    
    # Verify state to prevent CSRF attacks - with more detailed logging
    received_state = args.get('state')
    expected_state = session.get("state")
    
    if not received_state:
        current_app.logger.error("No state received in callback")
        return False, "State verification failed - no state in request"
    
    if not expected_state:
        current_app.logger.error("No state found in session - session may have expired or cookies not working properly")
        # Continue with fallback check, handled in the route itself
        return False, "State verification failed - please try again"
    
    if received_state != expected_state:
        current_app.logger.error(f"State mismatch: received={received_state}, expected={expected_state}")
        # Continue with fallback check, handled in the route itself
        return False, "State verification failed - security token mismatch"
    
    if "error" in args:
        return False, args.get("error_description", "Unknown error")
    
    # Get the authorization code
    code = args.get("code")
    if not code:
        return False, "No authorization code received"
    
    # Create MSAL app instance
    msal_app = _get_msal_app()
    
    # Acquire token using authorization code
    # Use a tuple for scopes since that's one of the accepted types
    result = msal_app.acquire_token_by_authorization_code(
        code=code,
        scopes=scopes,
        redirect_uri=current_app.config['MICROSOFT_REDIRECT_URI']
    )
    
    if "error" in result:
        return False, result.get("error_description", "Token acquisition failed")
    
    
    
    # Get user info from ID token claims
    id_token_claims = result.get("id_token_claims")
    if not id_token_claims:
        return False, "No identity information found"
    
    # Get Microsoft AD object ID and tenant ID
    ms_object_id = id_token_claims.get("oid")
    organization_id = id_token_claims.get("tid")
    display_id = id_token_claims.get("preferred_username") or id_token_claims.get("email") #<-- Need to later remove this to not store email
    
    if not ms_object_id or not organization_id:
        return False, "Missing required identity information"
    
    # Store user info in session
    session["user"] = {
        "ms_object_id": ms_object_id,
        "organization_id": organization_id,
        "display_id": display_id
    }
    # Store tokens in session (securely)
    _store_auth_tokens(result)
    # Create or update user in database
    db_success, db_error = _create_or_update_user(ms_object_id, organization_id, display_id)
    if not db_success:
        return False, db_error
    
    return True, None

def get_user_info():
    """Get current user information from session"""
    return session.get("user")

def logout_user():
    """Log out the current user"""
    # Get user ID before clearing session
    user_info = session.get("user")
    if user_info and user_info.get("ms_object_id"):
        # Clear tokens from Redis
        token_storage = RedisTokenStorage()
        token_storage.redis_client.delete(token_storage._get_token_key(user_info["ms_object_id"]))
    
    # Clear auth-related session data
    session.pop("user", None)
    session.pop("tokens", None)
    session.pop("state", None)
    
    return True

def _get_msal_app():
    """Create and configure MSAL app instance"""
    try:

        
        msal_app = msal.PublicClientApplication(
            client_id=current_app.config['MICROSOFT_CLIENT_ID'],
            authority=current_app.config['MICROSOFT_AUTHORITY']
        )

        #The below for private clients  (need to check later which one to use)
        #msal_app = msal.ConfidentialClientApplication(
            #client_id=current_app.config['MICROSOFT_CLIENT_ID'],
            #authority=current_app.config['MICROSOFT_AUTHORITY'],
            #client_credential=current_app.config['MICROSOFT_CLIENT_SECRET'])


        return msal_app
    except Exception as e:
        import traceback
        print("ERROR in _get_msal_app:", str(e))
        print(traceback.format_exc())
        raise

def _store_auth_tokens(result):
    """Securely store authentication tokens in Redis"""
    from app.auth.token_storage import RedisTokenStorage
    
    # Get MSAL app instance for token validation
    msal_app = _get_msal_app()
    
    # Validate the ID token using MSAL's built-in validation
    if not result.get("id_token_claims"):
        current_app.logger.error("No ID token claims found")
        return False, "ID token validation failed"
    
    # Store tokens in Redis
    token_storage = RedisTokenStorage()
    user_id = session.get("user", {}).get("ms_object_id")
    if not user_id:
        return False, "User ID not found in session"
        
    token_storage.store_tokens(user_id, result)
    return True, None

def _create_or_update_user(ms_object_id, organization_id, display_id=None):
    """Create or update user in the database and set PostgreSQL session variables"""

    conn = get_db()
    try:
        # Check if user exists
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE ms_object_id = %s", (ms_object_id,))
        user = cursor.fetchone()
        
        if user:
            # Update existing user if needed
            if display_id:
                cursor.execute(
                    "UPDATE users SET display_id = %s WHERE ms_object_id = %s",
                    (display_id, ms_object_id)
                )
                session["user"]["id"] = user[0] 
        else:
            # Create new user
            cursor.execute(
                "INSERT INTO users (ms_object_id, organization_id, display_id) VALUES (%s, %s, %s) RETURNING id",
                (ms_object_id, organization_id, display_id)
            )
            user_id = cursor.fetchone()[0]
            session["user"]["ms_object_id"] = ms_object_id
        
        # Set PostgreSQL session variables for RLS
        cursor.execute("SET app.current_user_ms_object_id = %s", (str(session["user"]["ms_object_id"]),))
        cursor.execute("SET app.current_organization_id = %s", (organization_id,))
        
        conn.commit()
        return True, None
    except Exception as e:
        conn.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return False, f"Database error: {str(e)}"
    finally:
        # Connection will be closed by middleware
        pass