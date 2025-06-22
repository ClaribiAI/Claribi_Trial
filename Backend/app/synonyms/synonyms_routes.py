"""Synonyms Routes Module

This module contains routes for synonyms management functionality.
"""

from flask import Blueprint, request, jsonify, g, session, render_template
from typing import Dict, Any, Tuple, Union
import logging

from app.synonyms.synonyms_services import SynonymService
from app.projects import get_projects, get_project
from app.core.security import login_required, csrf_protected
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize blueprint
synonyms_bp = Blueprint('synonyms', __name__)



@synonyms_bp.route('/delete_synonym', methods=['POST'])
@login_required
@csrf_protected
def delete_synonym() -> Dict[str, Any]:
    """Delete a synonym for a field
    
    Returns:
        Dict: JSON response
    """
    try:
        table = request.form.get('table')
        field = request.form.get('field')
        synonym = request.form.get('synonym')
        field_type = request.form.get('field_type')
        
        # Delete the synonym
        success, error_message = SynonymService.delete_synonym(
            table=table,
            field=field,
            synonym=synonym,
            field_type=field_type
        )
        
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to delete synonym'
            }), 400
            
        return jsonify({
            'success': True
        })
    except Exception as e:
        logger.error(f"Error in delete_synonym: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@synonyms_bp.route('/clear_all_synonyms', methods=['POST'])
@login_required
@csrf_protected
def clear_all_synonyms() -> Dict[str, Any]:
    """Clear all synonyms for a field
    
    Returns:
        Dict: JSON response
    """
    try:
        table = request.form.get('table')
        field = request.form.get('field')
        field_type = request.form.get('field_type')
        
        # Clear the synonyms
        success, error_message = SynonymService.clear_all_synonyms(
            table=table,
            field=field,
            field_type=field_type
        )
        
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to clear synonyms'
            }), 400
            
        return jsonify({
            'success': True
        })
    except Exception as e:
        logger.error(f"Error in clear_all_synonyms: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@synonyms_bp.route('/save_synonyms', methods=['POST'])
@login_required
@csrf_protected
def save_synonyms() -> Dict[str, Any]:
    """Save multiple synonyms at once
    
    Returns:
        Dict: JSON response
    """
    try:
        if 'current_project_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Invalid request'
            }), 400
            
        data = request.json
        if not data or 'synonyms' not in data:
            return jsonify({
                'success': False,
                'error': 'No synonyms provided'
            }), 400
        
        project_id = session['current_project_id']
        report_id = session.get('current_report_id')
        
        # Save the synonyms
        success, error_message = SynonymService.save_multiple_synonyms(
            synonyms_to_add=data['synonyms'],
            project_id=project_id,
            report_id=report_id
        )
        
        if not success:
            return jsonify({
                'success': False,
                'error': error_message or 'Failed to save synonyms'
            }), 500
            
        return jsonify({
            'success': True
        })
    except Exception as e:
        logger.error(f"Error in save_synonyms: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 