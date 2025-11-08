"""Request validation module.

This module provides request validation utilities using Pydantic.
"""

import functools
from typing import Type, Callable, Any, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, ValidationError
from flask import request, abort, jsonify
from app.core.logging import get_logger

logger = get_logger(__name__)

class ValidationException(Exception):
    """Raised when request validation fails."""
    def __init__(self, errors: Dict[str, Any]):
        self.errors = errors
        super().__init__("Validation failed")

def validate_request(schema: Type[BaseModel]) -> Callable:
    """Decorator to validate request data against a Pydantic schema.
    
    Args:
        schema: Pydantic model class to validate against
        
    Returns:
        Callable: Decorated function
        
    Example:
        class ProjectCreate(BaseModel):
            name: str
            description: Optional[str] = None
            
        @validate_request(ProjectCreate)
        def create_project():
            data = g.validated_data
            ...
    """
    def decorator(f: Callable) -> Callable:
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            try:
                # Get request data based on content type
                if request.is_json:
                    data = request.get_json() or {}
                else:
                    data = request.form.to_dict() or {}

                # Ensure data is a dictionary
                if not isinstance(data, dict):
                    data = {}

                # Add user context if available
                from flask import g
                from app.auth2.middleware import get_current_user_from_token
                
                user = None
                if hasattr(g, 'current_user') and g.current_user:
                    user = g.current_user
                else:
                    # Try to get user from JWT token
                    user = get_current_user_from_token()
                    if user:
                        # Store in g for future use
                        g.current_user = user

                if user:
                    data['user_context'] = {
                        'ms_object_id': user.get('ms_object_id'),
                        'id': user.get('ms_object_id')  # Use ms_object_id as id for consistency
                    }
                
                # Validate against schema
                try:
                    validated = schema(**data)
                    request.validated_data = validated.dict()
                except ValidationError as e:
                    logger.warning(f"Schema validation failed: {e.errors()}")
                    return jsonify({
                        'error': 'Validation failed',
                        'details': e.errors()
                    }), 400
                except Exception as e:
                    logger.error(f"Unexpected validation error: {str(e)}")
                    return jsonify({
                        'error': 'Validation error',
                        'message': 'An unexpected error occurred during validation'
                    }), 400
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Request processing error: {str(e)}")
                return jsonify({
                    'error': 'Request error',
                    'message': 'An error occurred while processing the request'
                }), 400
                
        return decorated
    return decorator

# Common validation models
class PaginationParams(BaseModel):
    """Pagination parameters validation model."""
    page: int = 1
    per_page: int = 50
    
    def dict(self, *args, **kwargs) -> Dict[str, Any]:
        data = super().dict(*args, **kwargs)
        # Ensure safe bounds
        data['page'] = max(1, data['page'])
        data['per_page'] = min(max(1, data['per_page']), 100)
        return data

class DateRangeParams(BaseModel):
    """Date range parameters validation model."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    def dict(self, *args, **kwargs) -> Dict[str, Any]:
        data = super().dict(*args, **kwargs)
        # Ensure end_date is not before start_date
        if data['start_date'] and data['end_date']:
            if data['end_date'] < data['start_date']:
                data['end_date'] = data['start_date']
        return data 