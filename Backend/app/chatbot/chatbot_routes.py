"""Chatbot Routes Module

This module contains routes for chatbot functionality.
It provides endpoints for processing natural language queries and interacting with Power BI reports.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Tuple
import logging

from app.chatbot.chatbot_services import ChatbotService
from app.projects.services.project_service import ProjectService
from app.report_pages.report_pages_services import ReportPageService
from app.core.security import login_required, rate_limit, csrf_protected
from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    QueryValidationError,
    ReportUrlValidationError,
    FilterValidationError
)
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize blueprint
chatbot_bp = Blueprint('chatbot', __name__)

# Rate limit configuration
QUERY_LIMIT = 10000  # requests per hour

def get_user_rate_limit_key():
    """Get rate limit key based on user's ms_object_id."""
    return f"user:{g.user['ms_object_id']}"

@chatbot_bp.route('/chatbot/query', methods=['GET', 'POST', 'OPTIONS'])
@login_required
# @csrf_protected
@rate_limit(limit=QUERY_LIMIT, key_func=get_user_rate_limit_key)
def process_chatbot_query() -> Tuple[Dict[str, Any], int]:
    """Process a natural language query and generate a filtered Power BI URL.
    
    This endpoint analyzes the user's query and generates a Power BI report URL with 
    appropriate filters. It supports the following filter operators:
    
    - eq (equals): default for exact matches (e.g., "show me sales for customer John")
    - ne (not equal): for queries with negation (e.g., "show products not made in China")
    - ge (greater than or equal): (e.g., "sales at least 1000")
    - gt (greater than): (e.g., "age greater than 30")
    - le (less than or equal): (e.g., "price at most 50")
    - lt (less than): (e.g., "products below 20 in stock")
    - in (including): (e.g., "category in electronics, furniture")
    
    The operator is automatically determined from the wording of the query.
    
    Returns:
        tuple: (Response data, HTTP status code)
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 200
    
    # Handle GET requests - could be used for checking status or simple queries
    elif request.method == 'GET':
        return jsonify({
            'success': True,
            'message': 'Chatbot API is operational'
        }), 200
    
    # Handle POST requests - main chatbot query processing
    elif request.method == 'POST':
        try:
            # Validate user context
            if not g.user.get('ms_object_id'):
                logger.error("Missing ms_object_id in user context")
                return jsonify({'error': 'Invalid user context'}), 400
            
            # Validate request format
            if not request.is_json:
                return jsonify({
                    'success': False,
                    'error': 'Invalid request format - expected JSON'
                }), 400
            
            # Get request data
            data = request.get_json(force=True)
            query = data.get('query', '')
            project_id = int(data.get('project_id')) if data.get('project_id') is not None else None
            report_id = int(data.get('report_id')) if data.get('report_id') is not None else None
            
            # Log the incoming request data
            logger.info(f"Processing chatbot query: project_id={project_id}, report_id={report_id}, query='{query}'")
            
            # Check if report_id is blank, null, or not provided
            if not report_id:
                logger.info("Report ID is blank or null, selecting best report")
                # Select the best report based on the query
                selected_report = ChatbotService.select_best_report(query, project_id, report_id)
                if selected_report:
                    report_id = selected_report['id']
                    logger.info(f"Selected best report: {selected_report['name']} (ID: {report_id})")
                else:
                    logger.warning("No suitable report found")
                    return jsonify({
                        'success': False,
                        'error': 'No suitable report found for your query'
                    }), 404
            
            # Get project data
            project_data = ProjectService.get_project_data(project_id=project_id, report_id=report_id)
            if not project_data:
                return jsonify({
                    'success': False,
                    'error': 'Project data not found'
                }), 404
            
            selected_data = project_data.get('selected_data', {})
            synonyms = project_data.get('synonyms', {})
            value_rules = project_data.get('value_rules', {})
            report_url = project_data.get('report_url', None)
            
            # Verify report pages exist
            report_pages = ReportPageService.get_report_pages_for_project(project_id, report_id)
            if not report_pages:
                return jsonify({
                    'success': False,
                    'error': 'No report pages found'
                }), 404
            
            # Process the query
            success, url, response_message = ChatbotService.process_query(
                project_id,
                query,
                selected_data,
                synonyms,
                report_id,
                report_url,
                value_rules
            )
            
            # Extract filters from the URL if present
            filters = None
            if success and url and '$filter=' in url:
                filter_str = url.split('$filter=')[1].split('&')[0]
                # Make filters more readable by replacing encoded characters
                filter_str = filter_str.replace('%20', ' ').replace('%27', "'")
                
                # Convert operators to readable format
                operator_mapping = {
                    ' eq ': ' = ',
                    ' ne ': ' is not ',
                    ' gt ': ' greater than ',
                    ' ge ': ' greater than or equal to ',
                    ' lt ': ' less than ',
                    ' le ': ' less than or equal to ',
                    ' in ': ' in '
                }
                
                # Split multiple filters if they exist
                filter_parts = filter_str.split(' and ')
                formatted_filters = []
                
                for part in filter_parts:
                    # Extract table/field name and value
                    field_parts = part.strip().split('/')
                    if len(field_parts) == 2:
                        table_name = field_parts[0]
                        rest = field_parts[1]
                        
                        # Find which operator is used
                        used_operator = None
                        operator_value = None
                        for op in operator_mapping.keys():
                            if op in rest:
                                used_operator = op
                                field_name, value = rest.split(op)
                                operator_value = operator_mapping[op]
                                break
                        
                        if used_operator and operator_value:
                            # Remove quotes from value if present
                            value = value.strip("'")
                            # Format as "Field name operator Field Value"
                            formatted_filter = f"{field_name}{operator_value}{value}"
                            formatted_filters.append(formatted_filter)
                
                # Join all formatted filters
                filters = "; ".join(formatted_filters) if formatted_filters else None
            
            return jsonify({
                'success': success,
                'url': url,
                'message': response_message,
                'filters': filters
            }), 200 if success else 400
            
        except (QueryValidationError, ReportUrlValidationError, FilterValidationError) as e:
            logger.warning(f"Validation error in process_chatbot_query: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        except ProjectNotFoundError:
            return jsonify({'error': 'Project not found'}), 404
        except ProjectAccessDeniedError:
            return jsonify({'error': 'Access denied'}), 403
        except Exception as e:
            logger.error(f"Error processing chatbot request: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': f'Error processing request: {str(e)}'
            }), 500
    
    # Handle invalid request methods
    return jsonify({
        'success': False,
        'error': f'Invalid request method: {request.method}'
    }), 405 