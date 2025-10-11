"""
Error Handlers Module

This module provides standardized error responses and error handling utilities.
"""

from flask import jsonify, current_app
import logging
import traceback
import json
import sys

logger = logging.getLogger(__name__)

# Standard error types
class ErrorType:
    AUTHENTICATION = "authentication_error"
    AUTHORIZATION = "authorization_error"
    VALIDATION = "validation_error"
    NOT_FOUND = "not_found"
    DATABASE = "database_error"
    REDIS = "redis_error"
    EXTERNAL_SERVICE = "external_service_error"
    INTERNAL = "internal_error"
    RLS_VIOLATION = "rls_violation"

# HTTP status codes
class StatusCode:
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    INTERNAL_SERVER_ERROR = 500
    SERVICE_UNAVAILABLE = 503

def create_error_response(error_type, message, status_code, details=None):
    """Create a standardized error response
    
    Args:
        error_type (str): Type of error (use ErrorType constants)
        message (str): Human-readable error message
        status_code (int): HTTP status code
        details (dict): Optional additional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    response = {
        "success": False,
        "error": {
            "type": error_type,
            "message": message
        }
    }
    
    # Add details if provided
    if details:
        response["error"]["details"] = details
        
    return jsonify(response), status_code

def handle_authentication_error(message="Authentication required", details=None):
    """Handle authentication errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    logger.warning(f"Authentication error: {message}")
    return create_error_response(
        ErrorType.AUTHENTICATION,
        message,
        StatusCode.UNAUTHORIZED,
        details
    )

def handle_authorization_error(message="Access denied", details=None):
    """Handle authorization errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    logger.warning(f"Authorization error: {message}")
    return create_error_response(
        ErrorType.AUTHORIZATION,
        message,
        StatusCode.FORBIDDEN,
        details
    )

def handle_validation_error(message="Invalid request data", details=None):
    """Handle validation errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    logger.info(f"Validation error: {message}")
    return create_error_response(
        ErrorType.VALIDATION,
        message,
        StatusCode.BAD_REQUEST,
        details
    )

def handle_not_found_error(message="Resource not found", details=None):
    """Handle not found errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    logger.info(f"Not found error: {message}")
    return create_error_response(
        ErrorType.NOT_FOUND,
        message,
        StatusCode.NOT_FOUND,
        details
    )

def handle_database_error(message="Database error", details=None, log_exception=True):
    """Handle database errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        log_exception (bool): Whether to log the exception traceback
        
    Returns:
        tuple: (response_json, status_code)
    """
    if log_exception:
        logger.error(f"Database error: {message}")
        logger.error(traceback.format_exc())
    else:
        logger.error(f"Database error: {message}")
        
    return create_error_response(
        ErrorType.DATABASE,
        "A database error occurred",  # Generic message for users
        StatusCode.INTERNAL_SERVER_ERROR,
        None  # Don't expose database details
    )

def handle_rls_violation(message="Access denied", table=None, operation=None, details=None):
    """Handle Row Level Security policy violations
    
    Args:
        message (str): Error message
        table (str): Table name where violation occurred
        operation (str): Operation that was attempted
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    logger.warning(f"RLS policy violation: {message}")
    if table:
        logger.warning(f"Table: {table}")
    if operation:
        logger.warning(f"Operation: {operation}")
    
    user_message = "You do not have permission to access this resource"
    if operation:
        user_message = f"You do not have permission to {operation} this resource"
        
    return create_error_response(
        ErrorType.RLS_VIOLATION,
        user_message,
        StatusCode.FORBIDDEN,
        None  # Don't expose security details
    )

def handle_redis_error(message="Redis error", details=None, log_exception=True):
    """Handle Redis errors
    
    Args:
        message (str): Error message
        details (dict): Optional error details
        log_exception (bool): Whether to log the exception traceback
        
    Returns:
        tuple: (response_json, status_code)
    """
    if log_exception:
        logger.error(f"Redis error: {message}")
        logger.error(traceback.format_exc())
    else:
        logger.error(f"Redis error: {message}")
        
    return create_error_response(
        ErrorType.REDIS,
        "A temporary storage error occurred",  # Generic message for users
        StatusCode.INTERNAL_SERVER_ERROR,
        None  # Don't expose Redis details
    )

def handle_external_service_error(message="External service error", service=None, details=None, log_exception=True):
    """Handle external service errors
    
    Args:
        message (str): Error message
        service (str): Name of the external service
        details (dict): Optional error details
        log_exception (bool): Whether to log the exception traceback
        
    Returns:
        tuple: (response_json, status_code)
    """
    service_info = f" ({service})" if service else ""
    
    if log_exception:
        logger.error(f"External service error{service_info}: {message}")
        logger.error(traceback.format_exc())
    else:
        logger.error(f"External service error{service_info}: {message}")
        
    return create_error_response(
        ErrorType.EXTERNAL_SERVICE,
        "An external service is currently unavailable",  # Generic message for users
        StatusCode.SERVICE_UNAVAILABLE,
        None  # Don't expose service details
    )

def handle_unexpected_error(error=None, message="Unexpected error", details=None):
    """Handle unexpected errors
    
    Args:
        error (Exception): The exception that occurred
        message (str): Error message
        details (dict): Optional error details
        
    Returns:
        tuple: (response_json, status_code)
    """
    error_message = str(error) if error else message
    
    # Log the full error details
    logger.error(f"Unexpected error: {error_message}")
    logger.error(traceback.format_exc())
    
    # In debug mode, include more details
    if current_app.debug:
        error_details = {
            "exception": error.__class__.__name__ if error else None,
            "traceback": traceback.format_exc()
        }
        if details:
            error_details.update(details)
    else:
        error_details = None
        
    return create_error_response(
        ErrorType.INTERNAL,
        "An unexpected error occurred",  # Generic message for users
        StatusCode.INTERNAL_SERVER_ERROR,
        error_details
    )

def try_except_decorator(error_handler=None):
    """Decorator to handle exceptions in route functions
    
    Args:
        error_handler (callable): Function to handle errors (defaults to handle_unexpected_error)
        
    Returns:
        callable: Decorated function
    """
    if error_handler is None:
        error_handler = handle_unexpected_error
        
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                return error_handler(error=e)
        return wrapper
    return decorator 