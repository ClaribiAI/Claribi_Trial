from functools import wraps
from flask import jsonify, session
from app.auth2.middleware import get_current_user_from_session

def check_status_permission(f):
    """Decorator to check if user has permission to modify status"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user = get_current_user_from_session()
        if not current_user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        # Check if user has admin or developer role (can modify status)
        user_role = current_user.get('role')
        if user_role not in ['Claribi_Admin', 'Claribi_Developer']:
            return jsonify({
                'success': False,
                'error': 'Only admins and developers can modify status'
            }), 403

        return f(*args, **kwargs)
    return decorated_function

def filter_by_status(items, user_role='Claribi_User'):
    """Filter items based on their status and user role
    
    Args:
        items (list): List of items (projects/reports) to filter
        user_role (str): Role of the user (Claribi_Admin/Claribi_Developer/Claribi_User)
        
    Returns:
        list: Filtered list of items
    """
    if user_role in ['Claribi_Admin', 'Claribi_Developer']:
        # Admins and developers can see all items except deleted ones
        return [item for item in items if item['status'] != 'Deleted']
    else:
        # Regular users can only see live items
        return [item for item in items if item['status'] == 'Live'] 
