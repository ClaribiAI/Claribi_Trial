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


def get_user_groups(request):
    auth_header = request.headers.get("Authorization", "")

    if not auth_header:
        logging.error("No authorization header found")
        return set()
    
    if not auth_header.startswith("Bearer "):
        logging.error("Invalid authorization header format does not start with Bearer")
        return set()
    
    token = auth_header.split("Bearer ")[-1]
    logging.info(f"Extracted token length: {len(token)}")

    if not token or len(token) < 10:
        logging.error("Invalid token length")
        return set()
    
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        groups = set(decoded.get("groups", []))
        
        logging.info(f"Extracted groups: {groups}")
        logging.info(f"Total groups: {len(groups)}")
        
        if groups:
            logging.info(f"User belongs to {len(groups)} groups")
    except Exception as e:
        logging.error(f"Error getting user groups: {e}")
        return set()
    
    return groups


def get_user_groups_from_token(token: str) -> set:
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        groups = set(decoded.get("groups", []))
        return groups
    except Exception as e:
        logging.error(f"Error getting user groups from token: {e}")
        return set()