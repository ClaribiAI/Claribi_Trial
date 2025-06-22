"""Reports Routes Module

This module contains all routes related to report management functionality.
"""

from flask import Blueprint, request, g, jsonify, session
from typing import Dict, Any, Tuple
import logging

from app.projects.services.project_service import ProjectService
from app.reports.reports_services import ReportService
from app.report_pages.report_pages_services import ReportPageService
from app.reports.validators.report_validator import (
    validate_report_create,
    validate_report_update,
    validate_report_filter,
    ReportCreate,
    ReportUpdate,
    ReportFilter
)
from app.core.security import login_required, rate_limit, csrf_protected
from app.middleware.status_middleware import check_status_permission
from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ReportNotFoundError,
    ReportValidationError
)
from app.core.logging import get_logger
from app.core.validation import validate_request

logger = get_logger(__name__)

# Initialize blueprint
reports_bp = Blueprint('reports', __name__)

# Rate limit configuration
LIST_LIMIT = 1000  # requests per hour
MUTATION_LIMIT = 500  # requests per hour

def get_user_rate_limit_key():
    """Get rate limit key based on user's ms_object_id."""
    return f"user:{g.user['ms_object_id']}"

@reports_bp.route('/project/<int:project_id>/reports', methods=['GET'])
@login_required
@rate_limit(limit=LIST_LIMIT, key_func=get_user_rate_limit_key)
@validate_request(ReportFilter)
def get_reports_for_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Get all reports for a specific project, excluding deleted reports.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Get reports using service
        reports = ReportService.get_all_reports_for_project(project_id)
        
        formatted_reports = []
        for report in reports:
            created_at = report.get('created_at')
            updated_at = report.get('updated_at')
            
            formatted_reports.append({
                'id': report.get('id'),
                'name': report.get('name'),
                'description': report.get('description', ''),
                'project_id': report.get('project_id'),
                'default_report': report.get('default_report', False),
                'status': report.get('status', 'In Draft'),
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None,
                'updated_at': updated_at.strftime('%Y-%m-%d %H:%M:%S') if updated_at else None
            })
        
        return jsonify({
            'success': True,
            'reports': formatted_reports
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in get_reports_for_project: {str(e)}")
        return jsonify({'error': 'Failed to get reports'}), 500

@reports_bp.route('/project/<int:project_id>/create_report', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
@validate_request(ReportCreate)
def create_report_endpoint(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Create a new report for a project.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        data = request.validated_data
        report_id = ReportService.create_report(
            project_id=project_id,
            report_name=data['name'],
            description=data.get('description'),
            default_report=data.get('default_report', False)
        )
        
        if not report_id:
            return jsonify({'error': 'Failed to create report'}), 500
            
        return jsonify({
            'success': True,
            'report_id': report_id
        }), 201
    except ReportValidationError as e:
        return jsonify({'error': str(e)}), 400
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Error in create_report: {str(e)}")
        return jsonify({'error': 'Failed to create report'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>', methods=['GET'])
@login_required
@rate_limit(limit=LIST_LIMIT)
def select_report(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Select a specific report for a project.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        # Set session data
        session['current_project_id'] = project_id
        session['current_report_id'] = report_id
        
        # Get project data
        project_data = ProjectService.get_project_data(project_id, report_id)
        
        # Initialize session data
        session['selected_data'] = project_data.get('selected_data', {}) if project_data else {}
        
        # Format dates
        created_at = report.get('created_at')
        updated_at = report.get('updated_at')
        
        return jsonify({
            'success': True,
            'report': {
                'id': report.get('id'),
                'name': report.get('name'),
                'description': report.get('description', ''),
                'project_id': report.get('project_id'),
                'default_report': report.get('default_report', False),
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None,
                'updated_at': updated_at.strftime('%Y-%m-%d %H:%M:%S') if updated_at else None
            },
            'project_data': {
                'tables_info': project_data.get('tables_info', {}) if project_data else {},
                'selected_data': project_data.get('selected_data', {}) if project_data else {},
                'report_url': project_data.get('report_url') if project_data else None
            }
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in select_report: {str(e)}")
        return jsonify({'error': 'Failed to select report'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/delete', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def delete_report_endpoint(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete (soft delete) a report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            logger.warning(f"Project not found or access denied. Project ID: {project_id}, User: {g.user['ms_object_id']}")
            return jsonify({'error': 'Project not found'}), 404
            
        success, error_message = ReportService.delete_report(report_id, project_id)
        if success:
            # Clear session if this was the current report
            if session.get('current_report_id') == report_id:
                for key in ['current_report_id', 'tables_info', 'selected_data', 'synonyms', 'report_url']:
                    session.pop(key, None)
                logger.info(f"Cleared session data for deleted report {report_id}")
            return jsonify({'success': True}), 200
        else:
            logger.error(f"Failed to delete report {report_id} from project {project_id}: {error_message}")
            return jsonify({'error': error_message or 'Failed to delete report'}), 500
    except ReportValidationError as e:
        logger.warning(f"Validation error deleting report: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except ProjectNotFoundError:
        logger.warning(f"Project not found. Project ID: {project_id}")
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        logger.warning(f"Access denied to project {project_id} for user {g.user['ms_object_id']}")
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"Unexpected error in delete_report_endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to delete report'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/edit', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def edit_report_endpoint(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Edit a report's details.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report to verify it exists
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        
        success = ReportService.edit_report(
            report_id=report_id,
            name=data.get('new_name'),
            description=data.get('new_description'),
            default_report=data.get('default_report')
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Report updated successfully'
            })
        else:
            logger.error(f"Failed to update report {report_id}")
            return jsonify({'error': 'Failed to update report'}), 500
    except ReportValidationError as e:
        return jsonify({'error': str(e)}), 400
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Unexpected error in edit_report_endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to update report'}), 500

@reports_bp.route('/clear_report_session', methods=['GET'])
@login_required
def clear_report_session() -> Tuple[Dict[str, Any], int]:
    """Clear report-related session data.
    
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        for key in ['current_report_id', 'tables_info', 'selected_data', 'synonyms', 'report_url']:
            session.pop(key, None)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error in clear_report_session: {str(e)}")
        return jsonify({'error': 'Failed to clear session'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/status', methods=['PUT'])
@login_required
@csrf_protected
@check_status_permission
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def update_report_status(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Update a report's status.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        new_status = request.json.get('status')
        if not new_status or new_status not in ['Live', 'In Draft']:
            logger.warning(f"Invalid status value provided: {new_status}")
            return jsonify({'error': 'Invalid status value'}), 400

        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            logger.warning(f"Project not found or access denied. Project ID: {project_id}, User: {g.user['ms_object_id']}")
            return jsonify({'error': 'Project not found'}), 404

        # Check project status before allowing report to go live
        if new_status == 'Live' and project.status != 'Live':
            logger.warning(f"Cannot set report to Live when project {project_id} is not Live (current status: {project.status})")
            return jsonify({'error': 'Cannot set report to Live when project is not Live'}), 400

        # Get report to verify it exists
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            logger.warning(f"Report not found. Report ID: {report_id}, Project ID: {project_id}")
            return jsonify({'error': 'Report not found'}), 404

        success = ReportService.edit_report(report_id, status=new_status)
        if success:
            logger.info(f"Successfully updated report {report_id} status to {new_status}")
            return jsonify({
                'success': True,
                'message': f'Report status updated to {new_status}'
            })
        else:
            logger.error(f"Failed to update report {report_id} status to {new_status}")
            return jsonify({'error': 'Failed to update report status'}), 500
    except ReportValidationError as e:
        logger.warning(f"Validation error updating report status: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except ProjectNotFoundError:
        logger.warning(f"Project not found. Project ID: {project_id}")
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        logger.warning(f"Access denied to project {project_id} for user {g.user['ms_object_id']}")
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        logger.warning(f"Report not found. Report ID: {report_id}")
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Unexpected error in update_report_status: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to update report status'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/config', methods=['GET'])
@login_required
@rate_limit(limit=LIST_LIMIT, key_func=get_user_rate_limit_key)
def get_report_config(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Get configuration data for a specific report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        # Get project data
        project_data = ProjectService.get_project_data(project_id, report_id)
        
        # Get report pages from ReportPageService
        report_pages = ReportPageService.get_report_pages_for_project(project_id, report_id)
        
        return jsonify({
            'success': True,
            'config': {
                'tables_info': project_data.get('tables_info', {}) if project_data else {},
                'selected_fields': project_data.get('selected_data', {}) if project_data else {},
                'synonyms': project_data.get('synonyms', {}) if project_data else {},
                'report_pages': report_pages
            }
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in get_report_config: {str(e)}")
        return jsonify({'error': 'Failed to get report configuration'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/fields', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def save_report_fields(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Save field selections for a report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        selected_fields = request.json.get('selected_fields', {})
        
        # Get existing project data
        project_data = ProjectService.get_project_data(project_id, report_id) or {}
        
        # Update and save project data
        success = ProjectService.save_project_data(
            project_id=project_id,
            report_id=report_id,
            tables_info=project_data.get('tables_info'),
            selected_data=selected_fields,
            synonyms=project_data.get('synonyms'),
            report_url=project_data.get('report_url')
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Field selections saved successfully'
            })
        else:
            return jsonify({'error': 'Failed to save field selections'}), 500
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in save_report_fields: {str(e)}")
        return jsonify({'error': 'Failed to save field selections'}), 500

@reports_bp.route('/project/<int:project_id>/report/<int:report_id>/synonyms', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def save_report_synonyms(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Save synonyms for a report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        synonyms = request.json.get('synonyms', {})
        
        # Get existing project data
        project_data = ProjectService.get_project_data(project_id, report_id) or {}
        
        # Update and save project data
        success = ProjectService.save_project_data(
            project_id=project_id,
            report_id=report_id,
            tables_info=project_data.get('tables_info'),
            selected_data=project_data.get('selected_data'),
            synonyms=synonyms,
            report_url=project_data.get('report_url')
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Synonyms saved successfully'
            })
        else:
            return jsonify({'error': 'Failed to save synonyms'}), 500
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in save_report_synonyms: {str(e)}")
        return jsonify({'error': 'Failed to save synonyms'}), 500

@reports_bp.route('/api/projects/<int:project_id>/reports/<int:report_id>/delete-table', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=MUTATION_LIMIT)
def delete_table_endpoint(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete a specific table from a report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        table_name = request.json.get('table_name')
        if not table_name:
            return jsonify({'error': 'Table name is required'}), 400
            
        # Delete the table
        success = ProjectService.delete_table_from_project_data(project_id, report_id, table_name)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Table {table_name} deleted successfully'
            })
        else:
            return jsonify({'error': f'Failed to delete table {table_name}'}), 500
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in delete_table: {str(e)}")
        return jsonify({'error': 'Failed to delete table'}), 500

@reports_bp.route('/api/projects/<int:project_id>/reports/<int:report_id>/value_rules', methods=['GET', 'POST'])
@login_required
@check_status_permission
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def api_manage_value_rules(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """API endpoint to manage value validation rules for a report.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        # Get project data
        project_data = ProjectService.get_project_data(project_id, report_id)
        if not project_data:
            return jsonify({'error': 'Project data not found'}), 404
        
        # Handle GET request
        if request.method == 'GET':
            existing_value_rules = project_data.get('value_rules', {})
            return jsonify({
                'success': True,
                'value_rules': existing_value_rules
            })
        
        # Handle POST request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        try:
            value_rules = request.json.get('value_rules', {})
        except:
            return jsonify({'error': 'Invalid JSON payload'}), 400
        
        # Save the updated value rules
        success = ProjectService.save_project_data(
            project_id=project_id,
            report_id=report_id,
            value_rules=value_rules
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Value rules updated successfully'
            })
        else:
            return jsonify({'error': 'Failed to save value rules'}), 500
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in api_manage_value_rules: {str(e)}")
        return jsonify({'error': 'Failed to manage value rules'}), 500

@reports_bp.route('/api/projects/<int:project_id>/reports/<int:report_id>/value_rules/generate', methods=['POST'])
@login_required
@rate_limit(limit=MUTATION_LIMIT, key_func=get_user_rate_limit_key)
def api_generate_value_rules(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """API endpoint to generate value validation rules using AI.
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify project exists and user has access
        project = ProjectService.get_project(project_id, g.user['ms_object_id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Get report using service
        report = ReportService.get_report_by_id(report_id, project_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
            
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        field_name = data.get('field_name', '').strip()
        field_type = data.get('field_type', '').strip()
        table_name = data.get('table_name', '').strip()
        
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
            
        if not field_name:
            return jsonify({'error': 'Field name is required'}), 400
            
        # Generate validation rules using AI
        from app.services.ai_service import generate_validation_rules
        result = generate_validation_rules(prompt, field_name, field_type, table_name)
        
        return jsonify(result)
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in api_generate_value_rules: {str(e)}")
        return jsonify({'error': 'Failed to generate value rules'}), 500