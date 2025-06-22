# File Processing Module

from flask import Blueprint

# Create blueprint
file_processing_bp = Blueprint('file_processing', __name__)

# Import routes to register them with the blueprint
from app.file_processing.file_processing_routes import api_upload_files, check_file_conflicts, check_data

# Register only the API endpoints used by the frontend
# The blueprint has a url_prefix of '/api' in the main app, so these routes will be accessible as:
# /api/project/<project_id>/report/<report_id>/upload
# /api/project/<project_id>/report/<report_id>/check_conflicts
# /api/project/<project_id>/report/<report_id>/check_data

# API endpoint for uploading files
file_processing_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/upload', 'api_upload_files', api_upload_files, methods=['POST'])

# API endpoint for checking for conflicts
file_processing_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/check_conflicts', 'check_file_conflicts', check_file_conflicts, methods=['POST'])

# API endpoint for checking if data exists
file_processing_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/check_data', 'check_data', check_data, methods=['GET'])

# Note: All other routes have been removed as they are not used by the frontend
__all__ = [
    'api_upload_files',
    'check_file_conflicts',
    'check_data'
]