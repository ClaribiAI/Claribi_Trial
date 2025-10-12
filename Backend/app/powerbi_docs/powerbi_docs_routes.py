from flask import request, jsonify
from werkzeug.utils import secure_filename
import os
import shutil
import tempfile
import time
import logging
from . import powerbi_docs_bp
from app.core.security import login_required
from app.powerbi_docs.powerbi_service_pbix import PowerBIPbixService
from app.powerbi_docs.ai_client import ai_client
from app.config.settings import config

# Initialize the service with the proper AI client instance
powerbi_docs_service = PowerBIPbixService(ai_client)

# Configure logger
logger = logging.getLogger(__name__)

def secure_path(filepath):
    """Secure a file path while preserving directory structure"""
    # Split the path and secure each component
    path_parts = filepath.replace('\\', '/').split('/')
    secured_parts = [secure_filename(part) for part in path_parts if part]
    return '/'.join(secured_parts)

def cleanup_temp_file(temp_file):
    """Safely cleanup temporary file with retry logic"""
    if temp_file and os.path.exists(temp_file.name):
        max_retries = 3
        retry_delay = 2
        
        # Close the file handle first to prevent Windows file locking issues
        try:
            temp_file.close()
        except:
            pass  # File might already be closed
        
        for attempt in range(max_retries):
            try:
                os.unlink(temp_file.name)
                logger.debug(f"Successfully deleted temporary file: {temp_file.name}")
                return
            except PermissionError:
                if attempt < max_retries - 1:
                    logger.debug(f"File {temp_file.name} is locked, retrying in {retry_delay} seconds... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.warning(f"Could not delete temporary file after {max_retries} attempts: {temp_file.name}")
            except Exception as e:
                logger.warning(f"Error deleting temporary file {temp_file.name}: {str(e)}")
                break

@powerbi_docs_bp.route('/api/powerbi-docs/analyze', methods=['POST'])
@login_required
def analyze_pbix_file_route():
    """
    Endpoint to analyze a Power BI .pbix file.
    Expects multipart form data with 'pbix_file' file.
    """
    temp_file = None
    try:
        if 'pbix_file' not in request.files:
            return jsonify({'error': 'PBIX file is required'}), 400

        file = request.files['pbix_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file extension
        if not file.filename.lower().endswith('.pbix'):
            return jsonify({'error': 'File must be a .pbix file'}), 400

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pbix')
        file.save(temp_file.name)

        # Analyze the PBIX file
        documentation = powerbi_docs_service.analyze_pbix_file(temp_file.name)
        
        return jsonify(documentation)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary file
        cleanup_temp_file(temp_file)

@powerbi_docs_bp.route('/api/powerbi-docs/test-utf8', methods=['GET'])
@login_required
def test_utf8_handling():
    """
    Test endpoint to verify UTF-8 character handling in the PowerBI docs service.
    Returns test results showing if special characters are preserved.
    """
    try:
        # Test UTF-8 handling
        test_result = powerbi_docs_service.test_utf8_handling()
        
        return jsonify({
            'status': 'success',
            'test_result': test_result,
            'message': 'UTF-8 character handling test completed'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Failed to test UTF-8 character handling'
        }), 500

@powerbi_docs_bp.route('/api/powerbi-docs/analyze-section/<section>', methods=['POST'])
@login_required
def analyze_pbix_section_route(section):
    """
    Endpoint to analyze a specific section of a Power BI .pbix file.
    Expects multipart form data with 'pbix_file' file and optional 'custom_instructions' text.
    """
    temp_file = None
    try:
        if 'pbix_file' not in request.files:
            return jsonify({'error': 'PBIX file is required'}), 400

        file = request.files['pbix_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file extension
        if not file.filename.lower().endswith('.pbix'):
            return jsonify({'error': 'File must be a .pbix file'}), 400

        # Get custom instructions if provided
        custom_instructions = request.form.get('custom_instructions', '')

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pbix')
        file.save(temp_file.name)

        # Analyze the specific section
        section_analysis = powerbi_docs_service.analyze_pbix_section(
            temp_file.name, 
            section, 
            custom_instructions
        )
        
        return jsonify({
            'section': section,
            'analysis': section_analysis,
            'custom_instructions': custom_instructions
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary file
        cleanup_temp_file(temp_file)

@powerbi_docs_bp.route('/api/powerbi-docs/parse-recommendations', methods=['POST'])
@login_required
def parse_improvement_recommendations_route():
    """
    Endpoint to parse improvement recommendations from a Power BI .pbix file.
    Expects multipart form data with 'pbix_file' file.
    """
    temp_file = None
    try:
        if 'pbix_file' not in request.files:
            return jsonify({'error': 'PBIX file is required'}), 400

        file = request.files['pbix_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file extension
        if not file.filename.lower().endswith('.pbix'):
            return jsonify({'error': 'File must be a .pbix file'}), 400

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pbix')
        file.save(temp_file.name)

        # Parse improvement recommendations
        recommendations = powerbi_docs_service.parse_improvement_recommendations(temp_file.name)
        
        return jsonify({
            'recommendations': recommendations,
            'count': len(recommendations)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary file
        cleanup_temp_file(temp_file)

@powerbi_docs_bp.route('/api/powerbi-docs/apply-recommendation/<recommendation_id>', methods=['POST'])
@login_required
def apply_improvement_recommendation_route(recommendation_id):
    """
    Endpoint to apply a specific improvement recommendation to a Power BI .pbix file.
    Expects multipart form data with 'pbix_file' file.
    """
    temp_file = None
    try:
        if 'pbix_file' not in request.files:
            return jsonify({'error': 'PBIX file is required'}), 400

        file = request.files['pbix_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file extension
        if not file.filename.lower().endswith('.pbix'):
            return jsonify({'error': 'File must be a .pbix file'}), 400

        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pbix')
        file.save(temp_file.name)

        # Apply the recommendation
        result = powerbi_docs_service.apply_improvement_recommendation(
            temp_file.name, 
            recommendation_id
        )
        
        return jsonify({
            'recommendation_id': recommendation_id,
            'result': result
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary file
        cleanup_temp_file(temp_file) 