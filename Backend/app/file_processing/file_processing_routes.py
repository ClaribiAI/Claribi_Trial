"""File Processing Routes Module

This module contains route handlers related to file processing functionality.
It was extracted from the original routes.py as part of the application restructuring.
"""

from flask import Blueprint, request, jsonify, session, g, current_app
from typing import Dict, Any, Tuple
from app.file_processing.file_processing_services import FileProcessingService, FileProcessingError
from app.core.security import login_required, csrf_protected, rate_limit
from app.core.logging import get_logger
from app.projects.services.project_service import ProjectService

logger = get_logger(__name__)

# Initialize blueprint
file_processing_bp = Blueprint('file_processing', __name__)

# Rate limit configuration
UPLOAD_LIMIT = 1000  # requests per hour

def get_user_rate_limit_key():
    """Get rate limit key based on user's ms_object_id."""
    return f"user:{g.user['ms_object_id']}"

@file_processing_bp.route('/project/<int:project_id>/report/<int:report_id>/check_conflicts', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=UPLOAD_LIMIT, key_func=get_user_rate_limit_key)
def check_file_conflicts(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Check for conflicts between uploaded files and existing tables
    
    Args:
        project_id: The ID of the project
        report_id: The ID of the report
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # First verify project exists and user has access using ProjectService
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found or access denied'
            }), 404

        files = request.files.getlist('files')
        
        if not files:
            return jsonify({
                'success': False,
                'error': 'No files were uploaded'
            }), 400
        
        # Detect conflicts using the service
        conflict_info = FileProcessingService.detect_table_conflicts(
            files=files,
            project_id=project_id,
            report_id=report_id
        )
        
        return jsonify({
            'success': True,
            'has_conflicts': conflict_info['has_conflicts'],
            'conflicting_tables': conflict_info['conflicting_tables'],
            'new_tables': conflict_info['new_tables'],
            'tables_count': len(conflict_info['tables_info'])
        })
    except FileProcessingError as e:
        logger.error(f"File processing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error checking file conflicts: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error checking file conflicts: {str(e)}'
        }), 500

@file_processing_bp.route('/project/<int:project_id>/report/<int:report_id>/upload', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=UPLOAD_LIMIT, key_func=get_user_rate_limit_key)
def api_upload_files(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """API endpoint for handling file uploads for a specific project and report
    
    Args:
        project_id: The ID of the project
        report_id: The ID of the report
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # First verify project exists and user has access using ProjectService
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found or access denied'
            }), 404

        files = request.files.getlist('files')
        
        if not files:
            return jsonify({
                'success': False,
                'error': 'No files were uploaded'
            }), 400
        
        # Process the uploaded files using the service
        tables_info = FileProcessingService.process_uploaded_files(
            files=files,
            project_id=project_id,
            report_id=report_id
        )
        
        if not tables_info:
            return jsonify({
                'success': False,
                'error': 'No valid data could be extracted from the files'
            }), 400
        
        # Store in session for consistency with other flows
        session['tables_info'] = tables_info
        session['current_project_id'] = project_id
        session['current_report_id'] = report_id
        
        return jsonify({
            'success': True,
            'message': 'Files uploaded and processed successfully',
            'tables_info': tables_info
        })
    except FileProcessingError as e:
        logger.error(f"File processing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error during file upload: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error processing uploaded files'
        }), 500

@file_processing_bp.route('/project/<int:project_id>/report/<int:report_id>/check_data', methods=['GET'])
@login_required
def check_data(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Check if data exists for a project/report
    
    Args:
        project_id: The ID of the project
        report_id: The ID of the report
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # First verify project exists and user has access using ProjectService
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found or access denied'
            }), 404

        # Get project data using the new service
        project_data = ProjectService.get_project_data(project_id=project_id, report_id=report_id)
        
        return jsonify({
            'success': True,
            'has_data': bool(project_data and project_data.get('tables_info')),
            'tables_info': project_data.get('tables_info', {}) if project_data else {}
        })
    except Exception as e:
        logger.error(f"Error checking data: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error checking data: {str(e)}'
        }), 500
