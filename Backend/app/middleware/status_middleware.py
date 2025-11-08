from functools import wraps
from flask import jsonify
from app.auth2.middleware import get_current_user_from_token

def check_status_permission(f):
    """Decorator to check if user is authenticated (role checks removed)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user = get_current_user_from_token()
        if not current_user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        return f(*args, **kwargs)
    return decorated_function

def filter_by_status(items):
    """Filter items based on their status (role-based filtering removed)
    
    Args:
        items (list): List of items (projects/reports) to filter
        
    Returns:
        list: Filtered list of items (excludes deleted items)
    """
    # All authenticated users can see all items except deleted ones
    return [item for item in items if item['status'] != 'Deleted'] 
