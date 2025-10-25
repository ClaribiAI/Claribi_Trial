from flask import request, jsonify
import logging
from typing import Dict
from . import powerbi_docs_bp
from app.core.security import login_required, get_current_user
from app.powerbi_docs.powerbi_service_pbix import PowerBIPbixService
from app.powerbi_docs.ai_client import ai_client
from app.powerbi_docs.services.token_tracking_service import powerbi_docs_token_tracking_service
from app.powerbi_docs.services.generated_docs_service import generated_docs_service
import psycopg
from app.config.settings import config
from app.powerbi_chat.services.vector_store_service import vector_store_service

# Initialize the service with the proper AI client instance
powerbi_docs_service = PowerBIPbixService(ai_client)

# Configure logger
logger = logging.getLogger(__name__)

def _get_summaries_by_collection(collection_name: str) -> tuple[Dict, str]:
    """
    Helper function to get summaries from database by collection name.
    
    Returns:
        tuple: (summaries_dict, filename) or (None, None) if not found
    """
    try:
        with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT semantic_model_summary, power_query_summary, visuals_summary, rls_summary, filename
                    FROM powerbi_file_summaries 
                    WHERE collection_name = %s
                """, (collection_name,))
                
                result = cursor.fetchone()
                
                if not result:
                    return None, None
                
                semantic_model_summary, power_query_summary, visuals_summary, rls_summary, filename = result
                
                summaries = {
                    'semantic_model_summary': semantic_model_summary,
                    'power_query_summary': power_query_summary,
                    'visuals_summary': visuals_summary,
                    'rls_summary': rls_summary or {}
                }
                
                return summaries, filename
                
    except Exception as e:
        logger.error(f"Error retrieving summaries for {collection_name}: {e}", exc_info=True)
        raise


@powerbi_docs_bp.route('/api/powerbi-docs/list-files', methods=['GET'])
@login_required
def list_uploaded_files():
    """
    Endpoint to list all uploaded Power BI files.
    Returns the same format as the chat service.
    """
    try:
        uploaded_files = vector_store_service.list_collections_with_details()
        return jsonify({
            'files': uploaded_files,
            'total_count': len(uploaded_files),
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error retrieving list of uploaded files: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve uploaded files.'}), 500

@powerbi_docs_bp.route('/api/powerbi-docs/get-summaries/<collection_name>', methods=['GET'])
@login_required
def get_file_summaries(collection_name):
    """
    Endpoint to get summaries for a specific collection.
    """
    try:
        summaries, filename = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return jsonify({'error': 'File summaries not found'}), 404
        
        # Get upload_time separately since it's not in the helper
        with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT upload_time
                    FROM powerbi_file_summaries 
                    WHERE collection_name = %s
                """, (collection_name,))
                
                result = cursor.fetchone()
                upload_time = result[0] if result else None
        
        return jsonify({
            'collection_name': collection_name,
            'filename': filename,
            'upload_time': upload_time.isoformat() if upload_time else None,
            'summaries': summaries,
            'status': 'success'
        })

    except Exception as e:
        logger.error(f"Error retrieving summaries for {collection_name}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve file summaries.'}), 500

@powerbi_docs_bp.route('/api/powerbi-docs/get-generated-docs/<collection_name>', methods=['GET'])
@login_required
def get_generated_docs(collection_name):
    """
    Endpoint to get all previously generated documentation sections for a collection.
    """
    try:
        generated_sections = generated_docs_service.get_all_generated_sections(collection_name)
        
        return jsonify({
            'collection_name': collection_name,
            'generated_sections': generated_sections,
            'status': 'success'
        })

    except Exception as e:
        logger.error(f"Error retrieving generated docs for {collection_name}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve generated documentation.'}), 500


@powerbi_docs_bp.route('/api/powerbi-docs/analyze-section/<section>', methods=['POST'])
@login_required
def analyze_pbix_section_route(section):
    """
    Endpoint to analyze a specific section using file summaries.
    Expects JSON data with 'collection_name' and optional 'custom_instructions'.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data is required'}), 400
            
        collection_name = data.get('collection_name')
        if not collection_name:
            return jsonify({'error': 'collection_name is required'}), 400
            
        custom_instructions = data.get('custom_instructions', '')

        # Get summaries from database using helper
        summaries, filename = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return jsonify({'error': 'File summaries not found'}), 404

        # Analyze the specific section using summaries
        section_analysis, token_usage = powerbi_docs_service.analyze_from_summaries(
            summaries, 
            section, 
            custom_instructions
        )
        
        # Save generated content to database with graceful error handling
        try:
            generated_docs_service.save_generated_section(
                collection_name,
                section,
                section_analysis
            )
        except Exception as save_error:
            # Log error but don't fail document generation
            logger.error(f"Failed to save generated section {section}: {save_error}", exc_info=True)
        
        # Record token usage with graceful error handling
        try:
            user = get_current_user()
            if user and user.get('ms_object_id'):
                powerbi_docs_token_tracking_service.record_token_usage(
                    user['ms_object_id'],
                    collection_name,
                    section,
                    token_usage.get('input_tokens', 0),
                    token_usage.get('output_tokens', 0)
                )
        except Exception as tracking_error:
            # Log error but don't fail document generation
            logger.error(f"Failed to record token usage for section {section}: {tracking_error}", exc_info=True)
        
        return jsonify({
            'section': section,
            'analysis': section_analysis,
            'custom_instructions': custom_instructions,
            'filename': filename,
            'token_usage': token_usage
        })

    except Exception as e:
        logger.error(f"Error analyzing section {section}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@powerbi_docs_bp.route('/api/powerbi-docs/parse-recommendations', methods=['POST'])
@login_required
def parse_improvement_recommendations_route():
    """
    Endpoint to parse improvement recommendations using file summaries.
    Expects JSON data with 'collection_name'.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data is required'}), 400
            
        collection_name = data.get('collection_name')
        if not collection_name:
            return jsonify({'error': 'collection_name is required'}), 400

        # Get summaries from database using helper
        summaries, filename = _get_summaries_by_collection(collection_name)
        
        if not summaries:
            return jsonify({'error': 'File summaries not found'}), 404

        # Parse improvement recommendations using summaries
        recommendations, token_usage = powerbi_docs_service.parse_improvement_recommendations_from_summaries(summaries)
        
        # Save generated recommendations to database with graceful error handling
        try:
            # Store the recommendations in the same format as other sections
            recommendations_data = {
                'recommendations': recommendations,
                'count': len(recommendations)
            }
            generated_docs_service.save_generated_section(
                collection_name,
                'improvement_recommendations',
                recommendations_data
            )
        except Exception as save_error:
            # Log error but don't fail recommendation parsing
            logger.error(f"Failed to save improvement recommendations: {save_error}", exc_info=True)
        
        # Record token usage with graceful error handling
        try:
            user = get_current_user()
            if user and user.get('ms_object_id'):
                powerbi_docs_token_tracking_service.record_token_usage(
                    user['ms_object_id'],
                    collection_name,
                    'improvement_recommendations',
                    token_usage.get('input_tokens', 0),
                    token_usage.get('output_tokens', 0)
                )
        except Exception as tracking_error:
            # Log error but don't fail recommendation parsing
            logger.error(f"Failed to record token usage for improvement recommendations: {tracking_error}", exc_info=True)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations),
            'filename': filename,
            'token_usage': token_usage
        })

    except Exception as e:
        logger.error(f"Error parsing recommendations: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
