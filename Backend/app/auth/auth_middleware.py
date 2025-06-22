"""Authentication Middleware Module

This module contains middleware functions for authentication.
"""

from functools import wraps
from flask import session, redirect, url_for, request, flash, abort, current_app, g
from app.models.users import User
from app.database.connection import get_db
from typing import Callable, Any
import logging

def get_current_user():
    """Get the current authenticated user from session
    
    Returns:
        User: The current user object or None if not authenticated
    """
    if "user" not in session:
        return None
        
    user_info = session["user"]
    ms_object_id = user_info.get("ms_object_id")
    
    if not ms_object_id:
        return None
        
    # Get user from database
    try:
        conn = get_db()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, ms_object_id, organization_id, display_id, created_at "
                "FROM users WHERE ms_object_id = %s",
                (ms_object_id,)
            )
            user_data = cursor.fetchone()
            
            if user_data:
                # Create a simple User object without using the full SQLAlchemy model
                return {
                    'id': user_data[0],
                    'ms_object_id': user_data[1],
                    'organization_id': user_data[2],
                    'display_id': user_data[3],
                    'created_at': user_data[4]
                }
    except Exception as e:
        current_app.logger.error(f"Error retrieving current user: {e}")
        
    return None
