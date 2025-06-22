"""Project Routes Module

This module contains routes for project management functionality.
"""

from flask import Blueprint, request, g, jsonify
from typing import Dict, Any, Tuple

from app.projects.models.project import Project
from app.projects.services.project_service import ProjectService
from app.projects.validators.project_validator import (
    validate_project_create,
    validate_project_update,
    validate_project_status,
    ProjectCreate,
    ProjectUpdate,
    ProjectFilter
)
from app.core.security import login_required, csrf_protected, rate_limit
from app.middleware.status_middleware import check_status_permission
from app.core.responses import success_response, error_response
from app.core.exceptions import (
    ProjectError,
    ProjectNotFoundError,
    ProjectValidationError,
    ProjectAccessDeniedError
)
from app.core.logging import get_logger
from app.core.validation import validate_request

logger = get_logger(__name__)

# Initialize blueprint
project_bp = Blueprint('projects', __name__)

# Rate limit configuration
LIST_LIMIT = 1000  # requests per hour
MUTATION_LIMIT = 100  # requests per hour

def get_user_rate_limit_key():
    """Get rate limit key based on user's ms_object_id."""
    return f"user:{g.user['ms_object_id']}"

@project_bp.route('/projects', methods=['GET'])
@login_required
@rate_limit(limit=LIST_LIMIT, key_func=get_user_rate_limit_key)
@validate_request(ProjectFilter)
def get_projects() -> Tuple[Dict[str, Any], int]:
    """Get all projects accessible by the current user.
    
    Query Parameters:
        page: Page number (default: 1)
        per_page: Items per page (default: 50, max: 100)
    
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        filter_data = request.validated_data
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # Use ms_object_id for project service
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        projects, metadata = ProjectService.get_projects(
            user_id=g.user['ms_object_id'],
            page=page,
            per_page=per_page,
            **filter_data
        )
        
        return jsonify({
            'items': [p.to_dict() for p in projects],
            'metadata': metadata
        })
    except ProjectError as e:
        logger.error(f"Project error in list_projects: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error in list_projects: {str(e)}")
        return jsonify({'error': 'Failed to list projects'}), 500

@project_bp.route('/project/<int:project_id>/select', methods=['GET'])
@login_required
@rate_limit(limit=LIST_LIMIT, key_func=get_user_rate_limit_key)
def get_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Get a specific project by ID.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        project = ProjectService.get_project(
            project_id=project_id,
            user_id=g.user['ms_object_id']
        )
        return jsonify(project.to_dict())
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in get_project: {str(e)}")
        return jsonify({'error': 'Failed to get project'}), 500

@project_bp.route('/project/create', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
@validate_request(ProjectCreate)
def create_project() -> Tuple[Dict[str, Any], int]:
    """Create a new project.
    
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        data = request.validated_data
        project = ProjectService.create_project(
            name=data['name'],
            description=data.get('description'),
            owner_id=g.user['ms_object_id']
        )
        
        return jsonify(project.to_dict()), 201
    except ProjectValidationError as e:
        logger.warning(f"Validation error in create_project: {str(e)}")
        return jsonify({'error': 'Validation error'}), 400
    except ProjectError as e:
        logger.error(f"Project error in create_project: {str(e)}")
        return jsonify({'error': 'Failed to create project'}), 500

@project_bp.route('/project/<int:project_id>/edit', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
@validate_request(ProjectUpdate)
def edit_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Edit a project's details.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        data = request.validated_data
        project = ProjectService.update_project(
            project_id=project_id,
            user_id=g.user['ms_object_id'],
            name=data['name'],
            description=data.get('description')
        )
        
        return jsonify(project.to_dict())
    except ProjectValidationError as e:
        logger.warning(f"Validation error in edit_project: {str(e)}")
        return jsonify({'error': 'Validation error'}), 400
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in edit_project: {str(e)}")
        return jsonify({'error': 'Failed to update project'}), 500

@project_bp.route('/project/<int:project_id>/rename', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def rename_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Rename a project.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
            
        project = ProjectService.rename_project(
            project_id=project_id,
            user_id=g.user['ms_object_id'],
            new_name=data['name']
        )
        
        return jsonify(project.to_dict())
    except ProjectValidationError as e:
        logger.warning(f"Validation error in rename_project: {str(e)}")
        return jsonify({'error': 'Validation error'}), 400
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in rename_project: {str(e)}")
        return jsonify({'error': 'Failed to rename project'}), 500

@project_bp.route('/project/<int:project_id>/delete', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def delete_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete a project.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        ProjectService.delete_project(
            project_id=project_id,
            user_id=g.user['ms_object_id']
        )
        
        return '', 204
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in delete_project: {str(e)}")
        return jsonify({'error': 'Failed to delete project'}), 500
    
@project_bp.route('/project/<int:project_id>/status', methods=['PUT'])
@login_required
@csrf_protected
@check_status_permission
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def update_project_status(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Update a project's status.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Validate user context first
        if not hasattr(g, 'user') or not g.user or not isinstance(g.user, dict) or 'ms_object_id' not in g.user:
            logger.error("Missing or invalid user context in update_project_status")
            return jsonify({'error': 'Invalid user context'}), 400
            
        # Validate request data
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided in update_project_status")
            return jsonify({'error': 'No data provided'}), 400
            
        validated_data = validate_project_status(data)
        
        # Update status
        project = ProjectService.update_project_status(
            project_id=project_id,
            user_id=g.user['ms_object_id'],
            new_status=validated_data['status']
        )
        
        return jsonify(project.to_dict())
    except ProjectValidationError as e:
        logger.warning(f"Validation error in update_project_status: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in update_project_status: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to update project status'}), 500

@project_bp.route('/project/<int:project_id>/leave', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def leave_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Leave a project by removing user's access.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not g.user.get('ms_object_id'):
            logger.error("Missing ms_object_id in user context")
            return jsonify({'error': 'Invalid user context'}), 400
            
        # Check if user is owner
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if project.access_type == 'owner':
            return jsonify({'error': 'Project owner cannot leave the project'}), 403
            
        # Remove user's access
        success, message = ProjectService.revoke_project_access(
            project_id=project_id,
            user_id=g.user['ms_object_id']
        )
        
        if not success:
            return jsonify({'error': message}), 400
            
        return '', 204
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in leave_project: {str(e)}")
        return jsonify({'error': 'Failed to leave project'}), 500 