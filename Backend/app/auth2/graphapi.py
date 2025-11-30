import logging
from typing import Tuple
import requests

GRAPH_API_URL = "https://graph.microsoft.com/v1.0/me"

    
def get_user_info_from_token(token: str) -> Tuple[bool, str, str, dict]:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    response = requests.get(GRAPH_API_URL, headers=headers)

    if response.status_code == 200:
        user_info = response.json()
        return True, user_info.get("id"), user_info.get("mail"), user_info
    else:
        # Log status code only to avoid leaking sensitive response data
        logging.error(f"Error getting user info from Graph API: HTTP {response.status_code}")
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
            # Log status code only to avoid leaking sensitive response data
            logging.error(f"Error validating token with Graph API: HTTP {response.status_code}")
            return False, None

    except Exception as e:
        # Log error without exposing details to prevent information leakage
        logging.error(f"Error validating token: {type(e).__name__}")
        return False, None

