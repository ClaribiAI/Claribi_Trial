"""Core Responses Module

This module contains helper functions for standardizing API responses.
"""

from typing import Dict, Any, Tuple, Optional
from flask import jsonify

def success_response(data: Dict[str, Any] = None, status_code: int = 200) -> Tuple[Dict[str, Any], int]:
    """Create a standardized success response.
    
    Args:
        data: Response data dictionary
        status_code: HTTP status code
        
    Returns:
        tuple: (Response dictionary, HTTP status code)
    """
    response = {
        'success': True,
        'data': data or {}
    }
    return jsonify(response), status_code

def error_response(
    status_code: int,
    message: str,
    details: Optional[Any] = None,
    error_code: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """Create a standardized error response.
    
    Args:
        status_code: HTTP status code
        message: Error message
        details: Additional error details
        error_code: Application-specific error code
        
    Returns:
        tuple: (Response dictionary, HTTP status code)
    """
    response = {
        'success': False,
        'error': {
            'message': message,
            'code': error_code or str(status_code)
        }
    }
    
    if details:
        response['error']['details'] = details
        
    return jsonify(response), status_code

def pagination_response(
    data: Dict[str, Any],
    page: int,
    per_page: int,
    total: int,
    status_code: int = 200
) -> Tuple[Dict[str, Any], int]:
    """Create a standardized paginated response.
    
    Args:
        data: Response data dictionary
        page: Current page number
        per_page: Items per page
        total: Total number of items
        status_code: HTTP status code
        
    Returns:
        tuple: (Response dictionary, HTTP status code)
    """
    response = {
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }
    return jsonify(response), status_code 