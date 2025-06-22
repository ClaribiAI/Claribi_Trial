from functools import wraps
from flask import jsonify, session
from app.database.connection import get_db
from app.auth.auth_middleware import get_current_user

def check_status_permission(f):
    """Decorator to check if user has permission to modify status"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user = get_current_user()
        if not current_user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        # Check if user is a data analyst
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT role FROM users WHERE ms_object_id = %s',
            (current_user['ms_object_id'],)
        )
        result = cursor.fetchone()
        
        if not result or result[0] != 'member':
            return jsonify({
                'success': False,
                'error': 'Only data analysts can modify status'
            }), 403

        return f(*args, **kwargs)
    return decorated_function

def filter_by_status(items, user_role='user'):
    """Filter items based on their status and user role
    
    Args:
        items (list): List of items (projects/reports) to filter
        user_role (str): Role of the user (data_analyst/user)
        
    Returns:
        list: Filtered list of items
    """
    if user_role == 'member':
        # Data analysts can see all items except deleted ones
        return [item for item in items if item['status'] != 'Deleted']
    else:
        # Regular users can only see live items
        return [item for item in items if item['status'] == 'Live'] 