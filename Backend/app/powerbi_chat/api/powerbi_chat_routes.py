# app/powerbi_chat/api/powerbi_chat_routes.py

import logging
import tempfile
import json
from flask import Blueprint, request, jsonify, Response, current_app, g
from threading import Thread
from queue import Queue, Empty
import time
from flask_cors import cross_origin
import os
from app.powerbi_chat.services.pbix_parsing_service import PBIXParsingService
from app.powerbi_chat.services.vector_store_service import vector_store_service
from app.powerbi_chat.services.rag_orchestration_service import rag_orchestration_service, RAGResult
from app.powerbi_chat.caching.cache_manager import cache_manager
from app.powerbi_docs.summary_generation_service import SummaryGenerationService
from app.auth2.middleware import auth_required
from app.core.database import get_db_cursor
from app.core.responses import error_response
from app.config.settings import config

logger = logging.getLogger(__name__)
powerbi_chat_bp = Blueprint('powerbi_chat', __name__)

@powerbi_chat_bp.route('/powerbi-chat/query-stream', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def process_powerbi_query_stream():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    data = request.get_json()
    query, session_id = data.get('query'), data.get('session_id')
    conversation_history = data.get('conversation_history', [])
    response_mode = data.get('response_mode', 'detailed')
    if not query or not session_id: return error_response(400, 'Query and session_id are required')
    
    # Extract user information from authentication
    user = g.current_user
    user_ms_object_id = user.get('ms_object_id') if user else None

    def generate_updates():
        try:
            # Stream a small initial update to open the SSE channel
            yield f"data: {json.dumps({'type': 'update', 'step': 'initial_retrieval', 'current_action': 'Retrieving initial context from your Power BI file...'})}\n\n"

            # Queue to receive updates from orchestrator thread
            updates_queue: Queue = Queue()
            result_container = {'result': None}

            def update_callback(update_data: dict):
                # Push each update into the queue to be streamed to client
                updates_queue.put(update_data)

            def run_orchestrator():
                try:
                    result: RAGResult = rag_orchestration_service.start_query(
                        session_id,
                        query,
                        update_callback=update_callback,
                        conversation_history=conversation_history,
                        response_mode=response_mode,
                        user_ms_object_id=user_ms_object_id
                    )
                    result_container['result'] = result
                finally:
                    # Signal completion to the streaming loop
                    updates_queue.put({'__final__': True})

            # Start orchestrator on a background thread
            worker = Thread(target=run_orchestrator, daemon=True)
            worker.start()

            # Stream updates as they arrive
            while True:
                try:
                    update = updates_queue.get(timeout=0.1)
                except Empty:
                    time.sleep(0.05)
                    continue

                if '__final__' in update:
                    break

                yield f"data: {json.dumps(update)}\n\n"

            # Send final payload depending on result status
            result = result_container['result']
            if not result:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No result generated.'})}\n\n"
                return

            if result.status == "NEEDS_CLARIFICATION":
                context_key = cache_manager.set(result.data['context_for_continuation'])
                final_data = {
                    'type': 'clarification_needed',
                    'user_clarifications': result.data['user_clarifications'],
                    'clarification_session_key': context_key
                }
                yield f"data: {json.dumps(final_data)}\n\n"
            elif result.status == "COMPLETE":
                yield f"data: {json.dumps({'type': 'final', 'answer': result.data['answer']})}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming query: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': 'An internal error occurred.'})}\n\n"

    return Response(generate_updates(), mimetype='text/event-stream')


@powerbi_chat_bp.route('/powerbi-chat/clarification', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def process_user_clarification():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    data = request.get_json()
    key, clarifications = data.get('clarification_session_key'), data.get('clarifications')
    if not key or not clarifications: return error_response(400, 'Key and clarifications required')
    
    # Extract user information from authentication
    user = g.current_user
    user_ms_object_id = user.get('ms_object_id') if user else None
        
    context = cache_manager.get(key)
    if not context: return error_response(400, 'Invalid or expired session.')

    # We can also add updates to the clarification flow if needed in the future
    result = rag_orchestration_service.continue_with_clarifications(context, clarifications, user_ms_object_id=user_ms_object_id)
    if result.status == "COMPLETE": return jsonify({'answer': result.data['answer'], 'status': 'success'})
    return error_response(500, 'Failed to generate a final response.')

# ... (The /upload and /list-files routes remain unchanged) ...
@powerbi_chat_bp.route('/powerbi-chat/upload', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def upload_powerbi_file():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    if 'pbix_file' not in request.files: return error_response(400, 'PBIX file is required')

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
        
        # Extract documents and metadata using the correct method with error handling
        try:
            documents, collection_metadata = PBIXParsingService.extract_and_chunk_with_metadata(temp_filename, file.filename)
            logger.info(f"Successfully extracted {len(documents)} documents from PBIX file")
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
        
        collection_name = vector_store_service.generate_collection_name()
        
        try:
            vector_store_service.create_collection(documents, collection_name, collection_metadata)
            logger.info(f"Successfully created vector collection: {collection_name}")
        except Exception as e:
            logger.error(f"Error creating vector collection for {file.filename}: {e}")
            return error_response(500, 'Failed to create vector collection. Please try again.')

        # Save summaries to database
        try:
            from datetime import datetime
            import json
            
            # Parse upload_time from collection_metadata
            upload_time_str = collection_metadata.get('upload_time', datetime.now().isoformat())
            if isinstance(upload_time_str, str):
                upload_time = datetime.fromisoformat(upload_time_str.replace('Z', '+00:00'))
            else:
                upload_time = datetime.now()
            
            with get_db_cursor(commit=True) as cursor:
                # Insert summary record using raw SQL
                cursor.execute("""
                    INSERT INTO powerbi_file_summaries 
                    (collection_name, filename, upload_time, semantic_model_summary, power_query_summary, visuals_summary, rls_summary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    collection_name,
                    file.filename,
                    upload_time,
                    json.dumps(summaries['semantic_model_summary']),
                    json.dumps(summaries['power_query_summary']),
                    json.dumps(summaries['visuals_summary']),
                    json.dumps(summaries.get('rls_summary', {}))
                ))
                
                logger.info(f"Saved summaries for collection {collection_name}")
                    
        except Exception as e:
            logger.error(f"Error saving summaries to database: {e}", exc_info=True)
            # Don't fail the upload if summary saving fails

        return jsonify({
            'session_id': collection_name,
            'filename': file.filename,
            'message': f"{len(documents)} chunks created and summaries saved.",
            'metadata': collection_metadata['summary'],
            'status': 'success'
        })
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
@auth_required
def list_uploaded_files():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    try:
        uploaded_files = vector_store_service.list_collections_with_details()
        return jsonify({
            'files': uploaded_files,
            'total_count': len(uploaded_files),
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error retrieving list of uploaded files: {e}", exc_info=True)
        return error_response(500, 'Failed to retrieve uploaded files.')


@powerbi_chat_bp.route('/powerbi-chat/delete-session', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def delete_powerbi_session():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return error_response(400, 'Session ID is required')
    
    try:
        success = vector_store_service.delete_collection(session_id)
        if success:
            return jsonify({
                'message': 'Session deleted successfully',
                'status': 'success'
            })
        else:
            return error_response(500, 'Failed to delete session')
    except Exception as e:
        logger.error(f"Error deleting Power BI session {session_id}: {e}", exc_info=True)
        return error_response(500, 'Failed to delete session')