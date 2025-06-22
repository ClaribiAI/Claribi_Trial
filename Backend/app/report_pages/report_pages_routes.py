"""Report Pages Routes Module

This module contains routes for report pages functionality.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Tuple
import logging

from app.projects.services.project_service import ProjectService
from app.reports.reports_services import ReportService
from app.report_pages.report_pages_services import ReportPageService
from app.core.security import login_required, csrf_protected
from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ReportNotFoundError
)
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize blueprint
report_pages_bp = Blueprint('report_pages', __name__)

@report_pages_bp.route('/project/<int:project_id>/report/<int:report_id>/pages', methods=['GET'])
@login_required
def get_report_pages(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Get all pages for a specific report
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify the project exists and user has access
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
            
        # Verify the report exists and belongs to the project
        report = ReportService.get_report_by_id(report_id=report_id, project_id=project_id)
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
        # Get pages for this report
        pages = ReportPageService.get_report_pages_for_project(project_id, report_id)
        
        # Format the response
        formatted_pages = []
        for page in pages:
            formatted_pages.append({
                'id': page.get('id'),
                'name': page.get('page_name'),
                'url': page.get('page_url'),
                'description': page.get('page_description', ''),
                'project_id': page.get('project_id'),
                'report_id': page.get('report_id')
            })
            
        return jsonify({
            'success': True,
            'pages': formatted_pages
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in get_report_pages: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@report_pages_bp.route('/project/<int:project_id>/report/<int:report_id>/page', methods=['POST'])
@login_required
@csrf_protected
def create_report_page_endpoint(project_id: int, report_id: int) -> Tuple[Dict[str, Any], int]:
    """Create a new page for a report
    
    Args:
        project_id: Project ID
        report_id: Report ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify the project exists and user has access
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
            
        # Verify the report exists and belongs to the project
        report = ReportService.get_report_by_id(report_id=report_id, project_id=project_id)
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
        # Get page data from request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
            
        page_name = request.json.get('name')
        page_url = request.json.get('url')
        page_description = request.json.get('description', '')
        
        # Create the page
        success, _, _, error_message = ReportPageService.add_report_page(
            project_id=project_id, 
            page_name=page_name,
            page_url=page_url,
            report_id=report_id,
            page_description=page_description
        )
    
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to create page'
            }), 500
            
        return jsonify({
            'success': True,
            'message': 'Page created successfully'
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in create_report_page: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@report_pages_bp.route('/project/<int:project_id>/report/<int:report_id>/page/<int:page_id>/delete', methods=['POST'])
@login_required
@csrf_protected
def delete_report_page_endpoint(project_id: int, report_id: int, page_id: int) -> Tuple[Dict[str, Any], int]:
    """Delete a report page
    
    Args:
        project_id: Project ID
        report_id: Report ID
        page_id: Page ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify the project exists and user has access
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
            
        # Verify the report exists and belongs to the project
        report = ReportService.get_report_by_id(report_id=report_id, project_id=project_id)
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
        # Verify the page exists and belongs to the specified project and report
        page = ReportPageService.get_report_page_by_id(page_id, project_id, report_id)
        if not page:
            return jsonify({
                'success': False,
                'error': 'Page not found or does not belong to the specified project and report'
            }), 404
        
        # Delete the page
        success, error_message = ReportPageService.delete_report_page(page_id, project_id, report_id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to delete page'
            }), 500
            
        return jsonify({
            'success': True,
            'message': 'Page deleted successfully'
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in delete_report_page: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@report_pages_bp.route('/project/<int:project_id>/report/<int:report_id>/page/<int:page_id>/edit', methods=['PUT'])
@login_required
@csrf_protected
def edit_report_page_endpoint(project_id: int, report_id: int, page_id: int) -> Tuple[Dict[str, Any], int]:
    """Edit a report page
    
    Args:
        project_id: Project ID
        report_id: Report ID
        page_id: Page ID
        
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        # Verify the project exists and user has access
        project = ProjectService.get_project(project_id=project_id, user_id=g.user['ms_object_id'])
        if not project:
            return jsonify({
                'success': False,
                'error': 'Project not found'
            }), 404
            
        # Verify the report exists and belongs to the project
        report = ReportService.get_report_by_id(report_id=report_id, project_id=project_id)
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        # Get page data from request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
            
        page_name = request.json.get('name')
        page_url = request.json.get('url')
        page_description = request.json.get('description', '')
            
        # Verify the page exists and belongs to the specified project and report
        page = ReportPageService.get_report_page_by_id(page_id, project_id, report_id)
        if not page:
            return jsonify({
                'success': False,
                'error': 'Page not found or does not belong to the specified project and report'
            }), 404
        
        # Edit the page
        success, error_message = ReportPageService.edit_report_page(
            page_id=page_id,
            project_id=project_id,
            report_id=report_id,
            page_name=page_name,
            page_url=page_url,
            page_description=page_description
        )
        
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to edit page'
            }), 500
            
        return jsonify({
            'success': True,
            'message': 'Page edited successfully'
        })
    except ProjectNotFoundError:
        return jsonify({'error': 'Project not found'}), 404
    except ProjectAccessDeniedError:
        return jsonify({'error': 'Access denied'}), 403
    except ReportNotFoundError:
        return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        logger.error(f"Error in edit_report_page: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 