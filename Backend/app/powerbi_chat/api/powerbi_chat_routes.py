# app/powerbi_chat/api/powerbi_chat_routes.py

import logging
import tempfile
import json
from flask import Blueprint, request, jsonify, Response,  current_app
from threading import Thread
from queue import Queue, Empty
import time
from flask_cors import cross_origin
import os
from app.powerbi_chat.services.pbix_parsing_service import PBIXParsingService
from app.powerbi_chat.services.vector_store_service import vector_store_service
from app.powerbi_chat.services.rag_orchestration_service import rag_orchestration_service, RAGResult
from app.powerbi_chat.caching.cache_manager import cache_manager

logger = logging.getLogger(__name__)
powerbi_chat_bp = Blueprint('powerbi_chat', __name__)

@powerbi_chat_bp.route('/powerbi-chat/query-stream', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_powerbi_query_stream():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    data = request.get_json()
    query, session_id = data.get('query'), data.get('session_id')
    if not query or not session_id: return jsonify({'error': 'Query and session_id are required'}), 400

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
                        update_callback=update_callback
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
@cross_origin()
def process_user_clarification():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    data = request.get_json()
    key, clarifications = data.get('clarification_session_key'), data.get('clarifications')
    if not key or not clarifications: return jsonify({'error': 'Key and clarifications required'}), 400
        
    context = cache_manager.get(key)
    if not context: return jsonify({'error': 'Invalid or expired session.'}), 400

    # We can also add updates to the clarification flow if needed in the future
    result = rag_orchestration_service.continue_with_clarifications(context, clarifications)
    if result.status == "COMPLETE": return jsonify({'answer': result.data['answer'], 'status': 'success'})
    return jsonify({'error': 'Failed to generate a final response.'}), 500

# ... (The /upload and /list-files routes remain unchanged) ...
@powerbi_chat_bp.route('/powerbi-chat/upload', methods=['POST', 'OPTIONS'])
@cross_origin()
def upload_powerbi_file():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'})
    if 'pbix_file' not in request.files: return jsonify({'error': 'PBIX file is required'}), 400

    file = request.files['pbix_file']
    if not file.filename.lower().endswith('.pbix'): return jsonify({'error': 'File must be a .pbix file'}), 400

    temp_dir = os.path.join(current_app.instance_path, 'temp_uploads')
    os.makedirs(temp_dir, exist_ok=True)

    # ✨ THE FIX: We manually control the temporary file's lifecycle
    # to ensure it's closed at the right time.
    temp_file = tempfile.NamedTemporaryFile(suffix='.pbix', dir=temp_dir, delete=False)
    temp_filename = temp_file.name

    try:
        file.save(temp_filename)
        # We must explicitly close the file handle here so PBIXRay can access it without conflict.
        temp_file.close()

        documents, collection_metadata = PBIXParsingService.extract_and_chunk_with_metadata(temp_filename, file.filename)
        collection_name = vector_store_service.generate_collection_name()
        vector_store_service.create_collection(documents, collection_name, collection_metadata)

        return jsonify({
            'session_id': collection_name,
            'filename': file.filename,
            'message': f"{len(documents)} chunks created.",
            'metadata': collection_metadata['summary'],
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Failed to process uploaded PBIX file: {e}", exc_info=True)
        return jsonify({'error': 'Failed to analyze the PBIX file.'}), 500
    finally:
        # The finally block now reliably deletes the file after all operations are done.
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


@powerbi_chat_bp.route('/powerbi-chat/list-files', methods=['GET', 'OPTIONS'])
@cross_origin()
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
        return jsonify({'error': 'Failed to retrieve uploaded files.'}), 500