from flask import request, jsonify, current_app
from flask_cors import cross_origin
import logging
import re
from typing import Dict, Optional, Tuple, Any
from datetime import datetime
from . import powerbi_docs_bp
# Authentication removed - diagnostics is now public
from app.powerbi_docs.powerbi_service_pbix import PowerBIPbixService
from app.powerbi_docs.ai_client import ai_client
from app.powerbi_docs.services.diagnostics_kpi_service import diagnostics_kpi_service
from app.powerbi_docs.services.generated_docs_service import generated_docs_service
# Documentation services removed - only diagnostics functionality remains
from app.core.responses import error_response
from app.core.database import get_db_cursor
# Token limit service removed - diagnostics is now public

# Initialize the service with the proper AI client instance
powerbi_docs_service = PowerBIPbixService(ai_client)

# Configure logger
logger = logging.getLogger(__name__)

# Note: PDF formatting templates are now stored in frontend and sent with each request
# No backend storage needed - works with multiple instances

# Allowed section types removed - only diagnostics functionality remains

def _validate_collection_name(collection_name: str) -> bool:
    """
    Validate and sanitize collection_name to prevent SQL injection and path traversal.
    
    Collection names should be alphanumeric with underscores and hyphens only,
    matching the pattern: pbix_ prefix + hex UUID (32 hex characters).
    
    Args:
        collection_name: The collection name to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not collection_name or not isinstance(collection_name, str):
        return False
    
    # Collection names should match pattern: pbix_ followed by 32 hex characters
    pattern = r'^pbix_[a-f0-9]{32}$'
    return bool(re.match(pattern, collection_name))

def _get_summaries_by_collection(collection_name: str, session_token: str = None) -> Tuple[Optional[Dict], Optional[str], Optional[datetime]]:
    """
    Helper function to get summaries from database by collection name.
    Verifies ownership via session_token for RLS.
    
    Args:
        collection_name: The collection name to retrieve
        session_token: Optional session token for ownership verification (if None, gets from Flask g)
    
    Returns:
        tuple: (summaries_dict, filename, upload_time) or (None, None, None) if not found or unauthorized
    """
    from flask import g
    from app.core.session_token import get_or_create_session_token
    
    # Get session token if not provided
    if session_token is None:
        session_token = getattr(g, 'session_token', None) or get_or_create_session_token()
    
    try:
        with get_db_cursor(commit=False) as cursor:
            # Verify ownership by checking session_token
            cursor.execute("""
                SELECT semantic_model_summary, power_query_summary, visuals_summary, rls_summary, filename, upload_time
                FROM powerbi_file_summaries 
                WHERE collection_name = %s AND session_token = %s
            """, (collection_name, session_token))
            
            result = cursor.fetchone()
            
            if not result:
                # File not found or user doesn't own it
                logger.warning(f"Access denied or file not found: collection={collection_name}, session={session_token[:8] if session_token else 'None'}...")
                return None, None, None
            
            semantic_model_summary, power_query_summary, visuals_summary, rls_summary, filename, upload_time = result
            
            summaries = {
                'semantic_model_summary': semantic_model_summary,
                'power_query_summary': power_query_summary,
                'visuals_summary': visuals_summary,
                'rls_summary': rls_summary or {}
            }
            
            return summaries, filename, upload_time
                
    except Exception as e:
        logger.error(f"Error retrieving summaries for {collection_name}: {e}", exc_info=True)
        raise


@powerbi_docs_bp.route('/api/powerbi-docs/list-files', methods=['GET'])
@cross_origin(supports_credentials=True)
def list_uploaded_files():
    """
    Endpoint to list all uploaded Power BI files.
    Returns only files owned by the current session.
    Returns the same format as the chat service.
    """
    from flask import g
    from app.core.session_token import get_or_create_session_token, ensure_session_token_in_response
    
    try:
        # Get session token (from cookie or generate new)
        session_token = get_or_create_session_token()
        
        # Query summaries table - filter by session token for RLS
        uploaded_files = []
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT collection_name, filename, upload_time, 
                       semantic_model_summary, power_query_summary, visuals_summary
                FROM powerbi_file_summaries
                WHERE session_token = %s
                ORDER BY upload_time DESC
            """, (session_token,))
            results = cursor.fetchall()
            
            for row in results:
                collection_name, filename, upload_time, semantic_model_summary, power_query_summary, visuals_summary = row
                
                # Parse summaries to get counts
                import json
                try:
                    semantic_model = json.loads(semantic_model_summary) if semantic_model_summary else {}
                    visuals = json.loads(visuals_summary) if visuals_summary else {}
                    
                    tables = semantic_model.get('tables', [])
                    total_measures = sum(len(t.get('measures', [])) for t in tables)
                    total_columns = sum(len(t.get('columns', [])) for t in tables)
                    relationships = semantic_model.get('relationships', [])
                    power_query_scripts = power_query_summary and json.loads(power_query_summary) or {}
                    pages = visuals.get('pages', [])
                    visuals_list = visuals.get('visuals', [])
                    
                    summary = {
                        'tables_count': len(tables),
                        'measures_count': total_measures,
                        'columns_count': total_columns,
                        'relationships_count': len(relationships),
                        'power_query_scripts_count': len(power_query_scripts.get('scripts', [])),
                        'pages_count': len(pages),
                        'visuals_count': len(visuals_list)
                    }
                except Exception as e:
                    logger.warning(f"Error parsing summaries for {collection_name}: {e}")
                    summary = {}
                
                uploaded_files.append({
                    'collection_name': collection_name,
                    'filename': filename,
                    'upload_time': upload_time.isoformat() if upload_time else None,
                    'metadata': summary,
                    'document_count': 0  # No longer tracking document count
                })
        
        # Create response and ensure session token cookie is set
        response = jsonify({
            'files': uploaded_files,
            'total_count': len(uploaded_files),
            'status': 'success'
        })
        
        # Ensure session token cookie is set in response
        response = ensure_session_token_in_response(response, session_token)
        
        return response
    except Exception as e:
        logger.error(f"Error retrieving list of uploaded files: {e}", exc_info=True)
        return error_response(500, 'Failed to retrieve uploaded files.')

@powerbi_docs_bp.route('/api/powerbi-docs/get-summaries/<collection_name>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_file_summaries(collection_name):
    """
    Endpoint to get summaries for a specific collection.
    """
    try:
        # Validate collection_name
        if not _validate_collection_name(collection_name):
            return error_response(400, 'Invalid collection name format')
        
        summaries, filename, upload_time = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return error_response(404, 'File summaries not found')
        
        return jsonify({
            'collection_name': collection_name,
            'filename': filename,
            'upload_time': upload_time.isoformat() if upload_time else None,
            'summaries': summaries,
            'status': 'success'
        })

    except Exception as e:
        logger.error(f"Error retrieving summaries for {collection_name}: {e}", exc_info=True)
        return error_response(500, 'Failed to retrieve file summaries.')

# Documentation generation routes removed - only diagnostics functionality remains

# Section name for storing recommendations
RECOMMENDATIONS_SECTION_NAME = 'improvement_recommendations'

@powerbi_docs_bp.route('/api/powerbi-docs/get-recommendations/<collection_name>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_recommendations(collection_name):
    """
    Endpoint to get stored recommendations for a specific collection.
    Returns existing recommendations if they exist, or 404 if not found.
    """
    try:
        # Validate collection_name
        if not _validate_collection_name(collection_name):
            return error_response(400, 'Invalid collection name format')
        
        # Get stored recommendations using generated_docs_service
        stored_section = generated_docs_service.get_generated_section(collection_name, RECOMMENDATIONS_SECTION_NAME)
        
        if not stored_section or not stored_section.get('content'):
            return error_response(404, 'Recommendations not found')
        
        # Extract recommendations from stored content
        content = stored_section['content']
        # Handle both direct list and wrapped content
        if isinstance(content, dict):
            recommendations = content.get('recommendations', content.get('content', []))
        elif isinstance(content, list):
            recommendations = content
        else:
            recommendations = []
        
        # Get filename for response
        _, filename, _ = _get_summaries_by_collection(collection_name)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations) if isinstance(recommendations, list) else 0,
            'filename': filename,
            'status': 'success'
        })
    
    except Exception as e:
        logger.error(f"Error retrieving recommendations for {collection_name}: {e}", exc_info=True)
        return error_response(500, 'Failed to retrieve recommendations')

@powerbi_docs_bp.route('/api/powerbi-docs/parse-recommendations', methods=['POST'])
@cross_origin(supports_credentials=True)
def parse_improvement_recommendations_route():
    """
    Endpoint to parse improvement recommendations using file summaries.
    Expects JSON data with 'collection_name' and optional 'force_regenerate' flag.
    If force_regenerate is False (default), checks for existing recommendations first.
    Note: PDF formatting is not used for improvement recommendations.
    """
    try:
        data = request.get_json()
        if not data:
            return error_response(400, 'JSON data is required')
            
        collection_name = data.get('collection_name')
        if not collection_name:
            return error_response(400, 'collection_name is required')
        
        # Validate collection_name
        if not _validate_collection_name(collection_name):
            return error_response(400, 'Invalid collection name format')

        # Check if we should force regeneration
        force_regenerate = data.get('force_regenerate', False)
        
        # If not forcing regeneration, check for existing recommendations first
        if not force_regenerate:
            stored_section = generated_docs_service.get_generated_section(collection_name, RECOMMENDATIONS_SECTION_NAME)
            if stored_section and stored_section.get('content'):
                # Extract recommendations from stored content
                content = stored_section['content']
                if isinstance(content, dict):
                    recommendations = content.get('recommendations', content.get('content', []))
                elif isinstance(content, list):
                    recommendations = content
                else:
                    recommendations = []
                
                if isinstance(recommendations, list) and len(recommendations) > 0:
                    # Get filename for response
                    _, filename, _ = _get_summaries_by_collection(collection_name)
                    logger.info(f"Returning existing recommendations for {collection_name}")
                    return jsonify({
                        'recommendations': recommendations,
                        'count': len(recommendations),
                        'filename': filename,
                        'from_cache': True,
                        'token_usage': {'input_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}
                    })

        # Get summaries from database using helper
        summaries, filename, _ = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return error_response(404, 'File summaries not found')

        # Parse improvement recommendations using summaries (no PDF formatting)
        recommendations, token_usage = powerbi_docs_service.parse_improvement_recommendations_from_summaries(summaries, None)
        
        # Store recommendations using generated_docs_service
        stored_content = {'recommendations': recommendations}
        generated_docs_service.save_generated_section(collection_name, RECOMMENDATIONS_SECTION_NAME, stored_content)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations),
            'filename': filename,
            'from_cache': False,
            'token_usage': token_usage
        })

    except Exception as e:
        logger.error(f"Error parsing recommendations: {e}", exc_info=True)
        return error_response(500, 'Failed to parse improvement recommendations')

@powerbi_docs_bp.route('/api/powerbi-docs/get-diagnostics-kpis/<collection_name>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_diagnostics_kpis(collection_name):
    """
    Endpoint to get diagnostic KPIs for a specific collection.
    """
    try:
        # Validate collection_name
        if not _validate_collection_name(collection_name):
            return error_response(400, 'Invalid collection name format')
        
        summaries, filename, _ = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return error_response(404, 'File summaries not found')
        
        # Calculate KPIs from summaries
        kpis = diagnostics_kpi_service.calculate_kpis(summaries)
        
        return jsonify({
            'collection_name': collection_name,
            'filename': filename,
            'kpis': kpis,
            'status': 'success'
        })
    
    except Exception as e:
        logger.error(f"Error calculating KPIs for {collection_name}: {e}", exc_info=True)
        return error_response(500, 'Failed to calculate diagnostic KPIs')

@powerbi_docs_bp.route('/api/powerbi-docs/get-diagnostics-kpi-details/<collection_name>/<kpi_type>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_diagnostics_kpi_details(collection_name, kpi_type):
    """
    Endpoint to get detailed items for a specific KPI type.
    
    Args:
        collection_name: The collection name
        kpi_type: One of 'unused_measures', 'unused_columns', 'inactive_relationships',
                  'large_tables', 'complex_measures', 'crowded_pages', 'many_to_many_relationships'
    """
    try:
        # Validate collection_name
        if not _validate_collection_name(collection_name):
            return error_response(400, 'Invalid collection name format')
        
        # Validate kpi_type
        valid_kpi_types = [
            'unused_measures', 
            'unused_columns', 
            'inactive_relationships',
            'large_tables',
            'complex_measures',
            'crowded_pages',
            'many_to_many_relationships'
        ]
        if kpi_type not in valid_kpi_types:
            return error_response(400, f'Invalid KPI type. Must be one of: {", ".join(valid_kpi_types)}')
        
        summaries, filename, _ = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return error_response(404, 'File summaries not found')
        
        # Calculate KPIs from summaries
        kpis = diagnostics_kpi_service.calculate_kpis(summaries)
        
        # Return only the requested KPI details
        kpi_data = kpis.get(kpi_type, {})
        
        return jsonify({
            'collection_name': collection_name,
            'filename': filename,
            'kpi_type': kpi_type,
            'details': kpi_data.get('items', []),
            'count': kpi_data.get('count', 0),
            'status': 'success'
        })
    
    except Exception as e:
        logger.error(f"Error getting KPI details for {collection_name}/{kpi_type}: {e}", exc_info=True)
        return error_response(500, 'Failed to get KPI details')

# Documentation rewrite route removed - only diagnostics functionality remains

# Note: PDF formatting endpoints (upload/remove/get) have been removed.
# PDFs are now stored in frontend and sent with each generation request.
# See FRONTEND_PDF_STORAGE.md for implementation details.