import logging
import os
from typing import Tuple
import msal
import requests
from app.config.settings import config

import jwt

GRAPH_API_URL = "https://graph.microsoft.com/v1.0/me"

    
def get_user_info_from_token(token: str) -> Tuple[bool, str, str, dict]:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    response = requests.get(GRAPH_API_URL, headers=headers)

    if response.status_code == 200:
        user_info = response.json()
        return True, user_info.get("id"), user_info.get("mail"), user_info
    else:
        logging.error(f"Error getting user info : {response.status_code} - {response.text}")
        return False, None, None, None

def validate_token(access_token: str) -> Tuple[bool, dict]:
    try:
        # Directly validate the token by calling Graph API
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(GRAPH_API_URL, headers=headers)

        if response.status_code == 200:
            user_data = response.json()
            return True, user_data
        else:
            logging.error(f"Error getting user info: {response.status_code} - {response.text}")
            return False, None

    except Exception as e:
        logging.error(f"Error validating token: {e}")
        return False, None




def get_app_access_token(tenant_id: str, client_id: str, client_secret: str, scope: str) -> str:
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
        "scope": scope,
    }

    try: 
        resp = requests.post(token_url, data=payload)
        resp.raise_for_status()
        return resp.json()["access_token"]
    except requests.exceptions.RequestException as e:
        logging.error(f"Error getting app access token: {e}")
        error_details = f"Failed to obtain app access token: {str(e)}"
        if hasattr(e, "response") and e.response is not None:
            try:
                error_response = e.response.json()
                error_code = error_response.get("error", "unknown_error")
                error_description = error_response.get("error_description", "Unknown error")
                error_details = (f"Azure AD error : {error_code} - {error_description} "
                               f"check client_id, client_secret, and scope config")
                logging.error(f"Azure AD error : {error_response}")
            except (ValueError, requests.exceptions.JSONDecodeError):
                error_details = (f"HTTP {e.response.status_code} - {e.response.text}")
                logging.error(f"HTTP error : {error_details}")
        raise RuntimeError(error_details)


def get_user_groups_from_token(token: str) -> set:
    """
    Extract user groups from Microsoft access token.
    
    Note: Token signature is not verified as this is used with already-validated
    Microsoft Graph API access tokens. Token format is validated.
    
    Args:
        token: Microsoft access token (JWT format)
        
    Returns:
        set: User groups from token claims, or empty set if error
    """
    if not token or not isinstance(token, str):
        logging.warning("Invalid token provided to get_user_groups_from_token")
        return set()
    
    # Basic JWT format validation (has 3 parts separated by dots)
    if len(token.split('.')) != 3:
        logging.warning("Token does not appear to be valid JWT format")
        return set()
    
    try:
        # Decode without signature verification (token already validated via Graph API)
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Validate token has required JWT claims
        if not isinstance(decoded, dict):
            logging.warning("Decoded token is not a dictionary")
            return set()
        
        # Extract groups claim
        groups_claim = decoded.get("groups", [])
        
        # Ensure groups is a list/iterable
        if isinstance(groups_claim, (list, tuple)):
            return set(groups_claim)
        elif isinstance(groups_claim, str):
            # Handle single group as string
            return {groups_claim}
        else:
            logging.warning(f"Groups claim is not in expected format: {type(groups_claim)}")
            return set()
            
    except jwt.DecodeError as e:
        logging.error(f"Error decoding token for groups: {e}")
        return set()
    except Exception as e:
        logging.error(f"Error getting user groups from token: {e}")
        return set()