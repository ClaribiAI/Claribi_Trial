# app/powerbi_chat/api/powerbi_chat_routes.py

import logging
import tempfile
import json
from flask import Blueprint, request, jsonify, current_app, g
from flask_cors import cross_origin
import os
from app.powerbi_chat.services.pbix_parsing_service import PBIXParsingService
from app.powerbi_docs.summary_generation_service import SummaryGenerationService
import uuid
# Authentication removed - diagnostics is now public
from app.core.database import get_db_cursor
from app.core.responses import error_response
from app.core.session_token import get_or_create_session_token, ensure_session_token_in_response
from app.config.settings import config

logger = logging.getLogger(__name__)
powerbi_chat_bp = Blueprint('powerbi_chat', __name__)


def get_client_ip():
    """
    Extract the real client IP address from the request.
    Handles proxy cases by checking X-Forwarded-For header.
    """
    # Check for X-Forwarded-For header (used by proxies/load balancers)
    if request.headers.get('X-Forwarded-For'):
        # X-Forwarded-For can contain multiple IPs, the first one is the original client
        forwarded_ips = request.headers.get('X-Forwarded-For').split(',')
        client_ip = forwarded_ips[0].strip()
        logger.info(f"Extracted IP from X-Forwarded-For: {client_ip}")
        return client_ip
    
    # Fallback to remote_addr
    client_ip = request.remote_addr
    logger.info(f"Using remote_addr as IP: {client_ip}")
    return client_ip

def ensure_user_exists(ms_object_id: str) -> None:
    """
    Ensure a user exists in the users table before saving documents.
    Checks if user exists first, then inserts if they don't.
    """
    if not ms_object_id:
        logger.warning("ensure_user_exists called with empty ms_object_id")
        return
    
    logger.info(f"Ensuring user exists: {ms_object_id}")
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if user already exists
            cursor.execute("""
                SELECT 1 FROM users WHERE ms_object_id = %s
            """, (ms_object_id,))
            exists = cursor.fetchone()
            
            if not exists:
                # User doesn't exist, insert them
                logger.info(f"User {ms_object_id} not found, inserting...")
                cursor.execute("""
                    INSERT INTO users (ms_object_id)
                    VALUES (%s)
                """, (ms_object_id,))
                logger.info(f"Successfully created new user in users table: {ms_object_id}")
            else:
                logger.info(f"User {ms_object_id} already exists in users table")
    except Exception as e:
        logger.error(f"Error ensuring user exists in users table for {ms_object_id}: {e}", exc_info=True)
        # Re-raise to prevent foreign key violations
        raise

# Chat routes removed - only file upload functionality remains for diagnostics
@powerbi_chat_bp.route('/powerbi-chat/upload', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def upload_powerbi_file():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    if 'pbix_file' not in request.files: return error_response(400, 'PBIX file is required')

    # Get or create session token (from cookie or generate new)
    session_token = get_or_create_session_token()
    
    # Check if this session has already uploaded a file
    try:
        with get_db_cursor(commit=False) as cursor:
            cursor.execute("""
                SELECT collection_name 
                FROM powerbi_file_summaries 
                WHERE session_token = %s
                LIMIT 1
            """, (session_token,))
            existing_upload = cursor.fetchone()
            
            if existing_upload:
                logger.warning(f"Upload attempt blocked for session {session_token[:8]}... - already has an upload")
                return error_response(
                    403, 
                    'You have already uploaded a file. To upload more files, please purchase a plan by visiting www.claribi.ai/claribi-console'
                )
    except Exception as e:
        logger.error(f"Error checking existing upload for session {session_token[:8]}...: {e}", exc_info=True)
        # Continue with upload if check fails (fail open for availability)
    
    # Use session token as user identifier (replaces IP-based identification)
    user_ms_object_id = session_token
    
    # Ensure user exists in users table before processing
    try:
        ensure_user_exists(user_ms_object_id)
    except Exception as e:
        logger.error(f"Failed to ensure user exists: {e}", exc_info=True)
        return error_response(500, 'Failed to initialize user session. Please try again.')

    file = request.files['pbix_file']
    
    # Enhanced file validation
    if not file.filename:
        return error_response(400, 'No file selected')
    
    # Check file size before processing
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > config.MAX_CONTENT_LENGTH:
        return error_response(413, f'File too large. Maximum size is {config.MAX_CONTENT_LENGTH // (1024*1024)}MB')
    
    if file_size == 0:
        return error_response(400, 'Empty file not allowed')

    temp_dir = os.path.join(current_app.instance_path, 'temp_uploads')
    os.makedirs(temp_dir, exist_ok=True)

    # ✨ THE FIX: We manually control the temporary file's lifecycle
    # to ensure it's closed at the right time.
    temp_file = tempfile.NamedTemporaryFile(suffix='.pbix', dir=temp_dir, delete=False)
    temp_filename = temp_file.name

    try:
        # Save file with progress tracking
        file.save(temp_filename)
        # We must explicitly close the file handle here so PBIXRay can access it without conflict.
        temp_file.close()

        # Log file processing start
        logger.info(f"Starting PBIX processing for file: {file.filename} (size: {file_size} bytes)")
        
        # Extract metadata using the correct method with error handling
        try:
            collection_metadata = PBIXParsingService.extract_metadata_with_summary(temp_filename, file.filename)
            logger.info(f"Successfully extracted metadata from PBIX file")
        except MemoryError as e:
            logger.error(f"Memory error processing PBIX file {file.filename}: {e}")
            return error_response(413, 'File too large to process. Please try with a smaller file.')
        except Exception as e:
            logger.error(f"Error extracting PBIX file {file.filename}: {e}")
            return error_response(400, 'Failed to process PBIX file. The file may be corrupted or in an unsupported format.')
        
        # Generate summaries using the powerbi_docs service
        try:
            summaries = SummaryGenerationService.generate_summaries_from_metadata(collection_metadata['structured_metadata'])
            logger.info(f"Successfully generated summaries for {file.filename}")
        except Exception as e:
            logger.error(f"Error generating summaries for {file.filename}: {e}")
            # Continue without summaries rather than failing completely
            summaries = []
        
        # Generate collection name (using same format as before for compatibility)
        unique_id = uuid.uuid4().hex
        collection_name = f"{config.VECTOR_STORE_COLLECTION_PREFIX}{unique_id}"

        # Save summaries to database
        try:
            from datetime import datetime
            import json
            
            # Ensure user exists before saving summaries
            ensure_user_exists(user_ms_object_id)
            
            # Parse upload_time from collection_metadata
            upload_time_str = collection_metadata.get('upload_time', datetime.now().isoformat())
            if isinstance(upload_time_str, str):
                upload_time = datetime.fromisoformat(upload_time_str.replace('Z', '+00:00'))
            else:
                upload_time = datetime.now()
            
            with get_db_cursor(commit=True) as cursor:
                # Insert summary record using raw SQL
                # Include session_token for RLS filtering
                cursor.execute("""
                    INSERT INTO powerbi_file_summaries 
                    (collection_name, filename, upload_time, semantic_model_summary, power_query_summary, visuals_summary, rls_summary, ms_object_id, session_token)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    collection_name,
                    file.filename,
                    upload_time,
                    json.dumps(summaries['semantic_model_summary']),
                    json.dumps(summaries['power_query_summary']),
                    json.dumps(summaries['visuals_summary']),
                    json.dumps(summaries.get('rls_summary', {})),
                    user_ms_object_id,
                    session_token
                ))
                
                logger.info(f"Saved summaries for collection {collection_name} with session {session_token[:8]}...")
                    
        except Exception as e:
            logger.error(f"Error saving summaries to database: {e}", exc_info=True)
            # Don't fail the upload if summary saving fails

        # Create response and ensure session token cookie is set
        response = jsonify({
            'session_id': collection_name,
            'filename': file.filename,
            'message': "Metadata extracted and summaries saved.",
            'metadata': collection_metadata['summary'],
            'status': 'success'
        })
        
        # Ensure session token cookie is set in response
        response = ensure_session_token_in_response(response, session_token)
        
        return response
    except Exception as e:
        logger.error(f"Failed to process uploaded PBIX file: {e}", exc_info=True)
        return error_response(500, 'Failed to analyze the PBIX file.')
    finally:
        # Memory cleanup and file cleanup
        try:
            # Force garbage collection to free memory
            import gc
            gc.collect()
            
            # The finally block now reliably deletes the file after all operations are done.
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                logger.info(f"Cleaned up temporary file: {temp_filename}")
        except Exception as cleanup_error:
            logger.error(f"Error during cleanup: {cleanup_error}")


@powerbi_chat_bp.route('/powerbi-chat/list-files', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def list_uploaded_files():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

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