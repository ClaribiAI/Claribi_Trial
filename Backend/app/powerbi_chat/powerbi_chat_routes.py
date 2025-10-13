"""
Power BI Chat Routes
Handles chat interactions for Power BI related questions and assistance
"""

import logging
import os
import tempfile
import warnings
from flask import Blueprint, request, jsonify, session, Response
from flask_cors import cross_origin
from datetime import datetime
import google.generativeai as genai
import json
import time

# PGVector deprecation warnings are resolved by using langchain_postgres
from app.config.settings import config
from app.powerbi_docs.ai_client import ai_client
from app.powerbi_chat.pbix_parser import PBIXParser
from app.powerbi_chat.rag_pipeline import RAGPipeline
from langchain_postgres import PGVector
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
import traceback

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
powerbi_chat_bp = Blueprint('powerbi_chat', __name__)

# Initialize RAG components
pbix_parser = PBIXParser()
rag_pipeline = RAGPipeline()

# In-memory cache for clarification context (temporary storage to avoid session context issues)
# In production, consider using Redis or another distributed cache
clarification_context_cache = {}

def cleanup_old_clarification_cache_entries(max_age_minutes=30):
    """
    Clean up old cache entries to prevent memory leaks.
    Entries older than max_age_minutes will be removed.
    """
    try:
        from datetime import datetime, timedelta
        
        current_time = datetime.now()
        keys_to_remove = []
        
        for key, value in clarification_context_cache.items():
            timestamp_str = value.get('timestamp')
            if timestamp_str:
                try:
                    entry_time = datetime.fromisoformat(timestamp_str)
                    age = current_time - entry_time
                    
                    if age > timedelta(minutes=max_age_minutes):
                        keys_to_remove.append(key)
                except Exception as parse_error:
                    logger.warning(f"Could not parse timestamp for cache entry {key}: {parse_error}")
                    keys_to_remove.append(key)  # Remove entries with invalid timestamps
        
        # Remove old entries
        for key in keys_to_remove:
            del clarification_context_cache[key]
            logger.info(f"Cleaned up old cache entry: {key}")
        
        if keys_to_remove:
            logger.info(f"Cache cleanup: Removed {len(keys_to_remove)} old entries. Remaining: {len(clarification_context_cache)}")
            
    except Exception as e:
        logger.error(f"Error during cache cleanup: {str(e)}")

@powerbi_chat_bp.route('/powerbi-chat/query', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_powerbi_query():
    """
    Process a Power BI related query from the user
    """
    try:
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        query = data.get('query', '').strip()
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400

        # Get session ID for RAG collection
        session_id = data.get('session_id')
        
        # Log the query for debugging
        logger.info(f"Processing Power BI query: {query[:100]}...")

        # Initialize chat history in session if not exists
        if 'powerbi_chat_history' not in session:
            session['powerbi_chat_history'] = []

        # Generate response using RAG pipeline if session_id provided, otherwise fallback to basic AI
        if session_id:
            try:
                logger.info(f"Using RAG pipeline with session_id: {session_id}")
                
                # Use iterative RAG if enabled, otherwise use standard RAG
                if config.ENABLE_ITERATIVE_RAG:
                    logger.info("Using iterative RAG approach")
                    rag_result = rag_pipeline.query_collection_iterative(session_id, query)
                    response = rag_result["response"]
                    
                    # Log iteration details for debugging
                    logger.info(f"Iterative RAG completed with {rag_result['iterations']} iterations")
                    logger.info(f"Context used: {rag_result['context_used']}")
                    if rag_result['follow_up_queries']:
                        logger.info(f"Follow-up queries used: {rag_result['follow_up_queries']}")
                else:
                    logger.info("Using standard RAG approach")
                    response = rag_pipeline.query_collection(session_id, query)
                    
                logger.info("Generated response using RAG pipeline")
            except Exception as rag_error:
                logger.error(f"RAG pipeline failed with error: {str(rag_error)}")
                logger.error(traceback.format_exc())
                logger.warning("Falling back to basic AI")
                response = generate_powerbi_response(query, session['powerbi_chat_history'], None)
        else:
            logger.info("No session_id provided, using basic AI")
            # Fallback to original method for queries without PBIX context
            response = generate_powerbi_response(query, session['powerbi_chat_history'], None)
        
        # Store the conversation in session
        conversation = {
            'timestamp': datetime.now().isoformat(),
            'user_query': query,
            'assistant_response': response,
            'query_type': classify_powerbi_query(query)
        }
        
        session['powerbi_chat_history'].append(conversation)
        
        # Keep only last 20 conversations to prevent session from growing too large
        if len(session['powerbi_chat_history']) > 20:
            session['powerbi_chat_history'] = session['powerbi_chat_history'][-20:]
        
        session.modified = True

        return jsonify({
            'answer': response,
            'timestamp': conversation['timestamp'],
            'query_type': conversation['query_type'],
            'status': 'success'
        }), 200

    except Exception as e:
        logger.error(f"Error processing Power BI query: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'An error occurred while processing your question. Please try again.',
            'details': str(e) if config.DEBUG else None
        }), 500



@powerbi_chat_bp.route('/powerbi-chat/delete-session', methods=['DELETE', 'OPTIONS'])
@cross_origin()
def delete_powerbi_session():
    """
    Delete a Power BI session (collection) from the vector database
    """
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        session_id = data.get('session_id')
        if not session_id:
            return jsonify({'error': 'Session ID is required'}), 400

        # Delete the collection from vector database
        success = rag_pipeline.delete_collection(session_id)
        
        if success:
            return jsonify({
                'message': 'Session deleted successfully',
                'session_id': session_id,
                'status': 'success'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to delete session',
                'session_id': session_id
            }), 500

    except Exception as e:
        logger.error(f"Error deleting Power BI session: {str(e)}")
        return jsonify({'error': 'Failed to delete session'}), 500

@powerbi_chat_bp.route('/powerbi-chat/query-stream', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_powerbi_query_stream():
    """
    Process a Power BI query with real-time streaming updates
    """
    try:
        logger.info(f"Received {request.method} request to /powerbi-chat/query-stream")
        
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            logger.info("Handling CORS preflight request")
            return jsonify({'status': 'ok'}), 200

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        query = data.get('query', '').strip()
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400

        session_id = data.get('session_id')
        if not session_id:
            logger.warning("No session_id provided - will use basic AI without RAG")
        
        max_iterations = data.get('max_iterations', 4)
        
        # Validate max_iterations
        if not isinstance(max_iterations, int) or max_iterations < 1 or max_iterations > 10:
            logger.warning(f"Invalid max_iterations: {max_iterations}, using default: 4")
            max_iterations = 4

        # Initialize chat history in session if not exists
        if 'powerbi_chat_history' not in session:
            session['powerbi_chat_history'] = []

        def generate_updates():
            try:
                # Step 1: Initial Context Retrieval
                yield f"data: {json.dumps({'type': 'update', 'step': 'initial_retrieval', 'current_action': 'Retrieving initial context from your Power BI file...'})}\n\n"
                time.sleep(0.5)

                if session_id:
                    try:
                        # Validate session_id
                        if not isinstance(session_id, str) or len(session_id) < 5:
                            raise ValueError(f"Invalid session_id format: {session_id}")
                        
                        # Use the working RAG pipeline method and send streaming updates
                        logger.info(f"Using iterative RAG pipeline with streaming for session_id: {session_id}")
                        logger.info(f"Query length: {len(query)} characters, max_iterations: {max_iterations}")
                        
                        # Use the new orchestration service with streaming updates
                        try:
                            from app.powerbi_chat.services.rag_orchestration_service import rag_orchestration_service
                            
                            # Store updates to send them via SSE
                            updates_to_send = []
                            
                            def collect_updates(update_data: dict):
                                """Collect updates to send via SSE."""
                                logger.info(f"Collecting update: {update_data}")
                                updates_to_send.append(update_data)
                            
                            # The orchestrator will call our callback function to collect updates
                            rag_result = rag_orchestration_service.start_query(
                                session_id, 
                                query, 
                                update_callback=collect_updates
                            )
                            
                            # Send all collected updates
                            logger.info(f"Sending {len(updates_to_send)} updates to frontend")
                            for i, update in enumerate(updates_to_send):
                                logger.info(f"Sending update {i+1}: {update}")
                                yield f"data: {json.dumps(update)}\n\n"
                                time.sleep(0.1)  # Small delay between updates
                            
                            # Convert RAGResult to the expected format
                            if rag_result.status == "NEEDS_CLARIFICATION":
                                rag_result_dict = {
                                    'needs_clarification': True,
                                    'user_clarifications': rag_result.data['user_clarifications'],
                                    'pre_fetched_context': rag_result.data['context_for_continuation'].get('pre_fetched_context', ''),
                                    'initial_context': rag_result.data['context_for_continuation'].get('initial_context', ''),
                                    'collection_name': rag_result.data['context_for_continuation'].get('collection_name', session_id),
                                    'original_query': rag_result.data['context_for_continuation'].get('original_query', query),
                                    'follow_up_queries': []
                                }
                            else:
                                rag_result_dict = {
                                    'needs_clarification': False,
                                    'response': rag_result.data['answer'],
                                    'follow_up_queries': []
                                }
                            
                            rag_result = rag_result_dict
                            
                        except ValueError as val_error:
                            logger.error(f"Validation error in RAG orchestration: {str(val_error)}")
                            raise
                        except Exception as rag_exec_error:
                            logger.error(f"Execution error in RAG orchestration: {str(rag_exec_error)}")
                            logger.error(traceback.format_exc())
                            raise
                        
                        # Send streaming updates based on the RAG result
                        if rag_result.get('needs_clarification'):
                            # Send user clarifications to frontend
                            user_clarifications = rag_result.get('user_clarifications', [])
                            logger.info(f"Sending user clarifications: {user_clarifications}")
                            
                            # Store pre-fetched context data in module-level cache (to avoid session context issues)
                            clarification_session_key = f"clarification_context_{session_id}_{hash(query)}"
                            logger.info(f"Generated clarification_session_key: {clarification_session_key}")
                            
                            # Include the clarification_session_key in the streaming update
                            logger.info(f"Sending clarification_session_key in streaming update: {clarification_session_key}")
                            yield f"data: {json.dumps({'type': 'update', 'step': 'user_clarification', 'user_clarifications': user_clarifications, 'clarification_session_key': clarification_session_key, 'current_action': f'Need {len(user_clarifications)} clarifications from user'})}\n\n"
                            time.sleep(0.5)
                            pre_fetched = rag_result.get('pre_fetched_context')
                            logger.info(f"DEBUG - pre_fetched_context from rag_result: {type(pre_fetched)}, length: {len(pre_fetched) if pre_fetched else 0}")
                            
                            clarification_context_cache[clarification_session_key] = {
                                'pre_fetched_context': pre_fetched,
                                'initial_context': rag_result.get('initial_context'),
                                'collection_name': rag_result.get('collection_name'),
                                'original_query': rag_result.get('original_query'),
                                'follow_up_queries': rag_result.get('follow_up_queries', []),
                                'timestamp': datetime.now().isoformat(),
                                'session_id': session_id,
                                'query': query
                            }
                            logger.info(f"Stored pre-fetched context in cache with key: {clarification_session_key}")
                            logger.info(f"Cache now contains {len(clarification_context_cache)} entries")
                            logger.info(f"DEBUG - Stored context lengths: pre_fetched={len(pre_fetched) if pre_fetched else 0}, initial={len(rag_result.get('initial_context', ''))}")
                            
                            # Send a final response indicating clarifications are needed
                            result = {
                                'type': 'clarification_needed',
                                'user_clarifications': user_clarifications,
                                'message': 'Please answer the clarification questions to continue.',
                                'clarification_session_key': clarification_session_key  # Send key to frontend
                            }
                            logger.info(f"Sending clarification_needed final response: {result}")
                            yield f"data: {json.dumps(result)}\n\n"
                            return
                        
                        # Send follow-up queries to frontend if available
                        follow_up_queries = rag_result.get('follow_up_queries', [])
                        if follow_up_queries:
                            logger.info(f"Sending {len(follow_up_queries)} follow-up queries to frontend: {follow_up_queries}")
                            yield f"data: {json.dumps({'type': 'update', 'step': 'follow_up_generation', 'follow_up_queries': follow_up_queries, 'current_action': f'Generated {len(follow_up_queries)} targeted searches'})}\n\n"
                            time.sleep(0.5)

                        # Send final response
                        yield f"data: {json.dumps({'type': 'update', 'step': 'final_response', 'current_action': 'Generating final response...'})}\n\n"
                        time.sleep(0.3)

                        # Create final result
                        result = {
                            'type': 'final',
                            'answer': rag_result.get('response', 'No response generated'),
                            'query_type': classify_powerbi_query(query),
                            'rag_details': {
                                'iterations': rag_result.get('iterations', 1),
                                'max_iterations': max_iterations,
                                'context_used': rag_result.get('context_used', {}),
                                'follow_up_queries': follow_up_queries,
                                'user_clarifications': rag_result.get('user_clarifications', [])
                            }
                        }

                        yield f"data: {json.dumps(result)}\n\n"

                    except Exception as rag_error:
                        logger.error(f"RAG pipeline failed with error: {str(rag_error)}")
                        # Fallback to basic AI
                        response = generate_powerbi_response(query, session.get('powerbi_chat_history', []), None)
                        result = {
                            'type': 'final',
                            'answer': response,
                            'query_type': classify_powerbi_query(query),
                            'rag_details': None
                        }
                        yield f"data: {json.dumps(result)}\n\n"
                else:
                    # No session, use basic AI
                    yield f"data: {json.dumps({'type': 'update', 'step': 'final_response', 'current_action': 'Generating response...'})}\n\n"
                    time.sleep(0.5)
                    
                    response = generate_powerbi_response(query, session.get('powerbi_chat_history', []), None)
                    result = {
                        'type': 'final',
                        'answer': response,
                        'query_type': classify_powerbi_query(query),
                        'rag_details': None
                    }
                    yield f"data: {json.dumps(result)}\n\n"

            except Exception as e:
                logger.error(f"Error in streaming query: {str(e)}")
                error_result = {
                    'type': 'final',
                    'error': 'An error occurred while processing your question. Please try again.',
                    'details': str(e) if config.DEBUG else None
                }
                yield f"data: {json.dumps(error_result)}\n\n"

        return Response(generate_updates(), mimetype='text/plain')

    except Exception as e:
        logger.error(f"Error in streaming endpoint: {str(e)}")
        return jsonify({
            'error': 'An error occurred while processing your question. Please try again.',
            'details': str(e) if config.DEBUG else None
        }), 500

@powerbi_chat_bp.route('/powerbi-chat/clarification', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_user_clarification():
    """
    Process user clarification responses and generate final response
    """
    try:
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        original_query = data.get('original_query', '').strip()
        clarifications = data.get('clarifications', {})  # Dict of question -> answer
        session_id = data.get('session_id')
        clarification_session_key = data.get('clarification_session_key')  # Get the stored context key
        
        if not original_query:
            return jsonify({'error': 'Original query is required'}), 400
        
        if not session_id:
            return jsonify({'error': 'Session ID is required'}), 400

        # Log the clarification processing
        logger.info(f"Processing user clarifications for query: {original_query[:100]}...")
        logger.info(f"Clarifications received: {list(clarifications.keys())}")

        # Initialize chat history in session if not exists
        if 'powerbi_chat_history' not in session:
            session['powerbi_chat_history'] = []

        try:
            # Clean up old cache entries first
            cleanup_old_clarification_cache_entries()
            
            # Retrieve pre-fetched context from cache if available
            pre_fetched_context = None
            stored_data = None
            
            if clarification_session_key:
                if clarification_session_key in clarification_context_cache:
                    try:
                        stored_data = clarification_context_cache[clarification_session_key]
                        logger.info(f"DEBUG - Retrieved cache data keys: {stored_data.keys()}")
                        pre_fetched_context = stored_data.get('pre_fetched_context')
                        logger.info(f"DEBUG - Retrieved pre_fetched_context: {type(pre_fetched_context)}, length: {len(pre_fetched_context) if pre_fetched_context else 0}")
                        
                        # Combine pre-fetched context with initial context for best results
                        initial_context_from_cache = stored_data.get('initial_context', '')
                        
                        if pre_fetched_context and initial_context_from_cache:
                            # Best case: we have both - combine them
                            logger.info(f"Retrieved both contexts from cache: pre_fetched={len(pre_fetched_context)} chars, initial={len(initial_context_from_cache)} chars")
                            combined_context = initial_context_from_cache + "\n\n--- Additional Context from Follow-up Queries ---\n\n" + pre_fetched_context
                            pre_fetched_context = combined_context
                            logger.info(f"Combined context length: {len(pre_fetched_context)} chars")
                        elif pre_fetched_context:
                            # Only have pre-fetched
                            logger.info(f"Retrieved pre-fetched context from cache (length: {len(pre_fetched_context)} chars)")
                        elif initial_context_from_cache:
                            # Only have initial - use it
                            logger.info(f"Pre-fetched context is empty, using initial_context instead (length: {len(initial_context_from_cache)} chars)")
                            pre_fetched_context = initial_context_from_cache
                        else:
                            logger.warning("Both pre-fetched and initial context are empty in stored cache data")
                        
                        logger.info(f"Cache entry created at: {stored_data.get('timestamp')}")
                        
                        # Clean up the cache data after use
                        del clarification_context_cache[clarification_session_key]
                        logger.info(f"Removed clarification context from cache. Remaining entries: {len(clarification_context_cache)}")
                    except Exception as cache_error:
                        logger.error(f"Error retrieving pre-fetched context from cache: {str(cache_error)}")
                        logger.error(traceback.format_exc())
                        pre_fetched_context = None
                else:
                    logger.warning(f"Clarification session key not found in cache: {clarification_session_key}")
                    logger.warning(f"Available cache keys: {list(clarification_context_cache.keys())}")
            else:
                logger.warning("No clarification_session_key provided - will retrieve context from scratch")
                
            # Validate clarifications
            if not clarifications or len(clarifications) == 0:
                logger.warning("No clarifications provided, proceeding with enhanced query only")
            
            # Enhance the original query with clarifications before processing
            enhanced_query = enhance_query_with_clarifications(original_query, clarifications)
            logger.info(f"Enhanced query with clarifications: {enhanced_query[:200]}...")
            
            # Use iterative RAG with pre-fetched context (skip initial retrieval if we have pre-fetched context)
            logger.info(f"Using iterative RAG with enhanced query and pre-fetched context for session_id: {session_id}")

            if pre_fetched_context:
                logger.info(f"Pre-fetched context available: {len(pre_fetched_context)} chars - will skip initial retrieval")
            rag_result = rag_pipeline.query_collection_iterative(
                session_id, 
                enhanced_query, 
                max_iterations=3,
                pre_fetched_context=pre_fetched_context
            )
            
            # Log details for debugging
            logger.info(f"Iterative RAG completed with {rag_result['iterations']} iterations")
            logger.info(f"Context used: {rag_result['context_used']}")
            if rag_result['follow_up_queries']:
                logger.info(f"Follow-up queries used: {rag_result['follow_up_queries']}")
                
            # Check if more clarifications are needed
            if rag_result.get('user_clarifications') and len(rag_result['user_clarifications']) > 0:
                logger.info(f"More clarifications needed: {rag_result['user_clarifications']}")
                
                # Generate a new clarification session key for the follow-up round
                new_clarification_key = f"clarification_context_{session_id}_{hash(enhanced_query)}"
                logger.info(f"Generated new clarification_session_key for follow-up: {new_clarification_key}")
                
                # Store the current context for the follow-up clarification round
                clarification_context_cache[new_clarification_key] = {
                    'pre_fetched_context': rag_result.get('pre_fetched_context'),
                    'initial_context': rag_result.get('initial_context'),
                    'collection_name': session_id,
                    'original_query': original_query,
                    'follow_up_queries': rag_result.get('follow_up_queries', []),
                    'timestamp': datetime.now().isoformat()
                }
                logger.info(f"Stored follow-up clarification context in cache with key: {new_clarification_key}")
                
                return jsonify({
                    'type': 'clarification_needed',
                    'user_clarifications': rag_result['user_clarifications'],
                    'message': 'Please answer the additional clarification questions to continue.',
                    'clarification_session_key': new_clarification_key,
                    'iterations': rag_result['iterations'],
                    'context_used': rag_result['context_used'],
                    'follow_up_queries': rag_result.get('follow_up_queries', [])
                }), 200
                
        except Exception as rag_error:
            logger.error(f"RAG pipeline failed with error: {str(rag_error)}")
            logger.error(traceback.format_exc())
            logger.warning("Falling back to basic AI")
            fallback_response = generate_powerbi_response(enhanced_query, session['powerbi_chat_history'], None)
            rag_result = {
                "response": fallback_response,
                "iterations": 0,
                "context_used": {"error": "RAG failed, used basic AI"},
                "follow_up_queries": [],
                "user_clarifications": []
            }
        
        # Store the conversation in session
        conversation = {
            'timestamp': datetime.now().isoformat(),
            'user_query': original_query,
            'assistant_response': rag_result['response'],
            'query_type': classify_powerbi_query(original_query),
            'rag_details': rag_result,
            'user_clarifications': clarifications
        }
        
        session['powerbi_chat_history'].append(conversation)
        
        # Keep only last 20 conversations to prevent session from growing too large
        if len(session['powerbi_chat_history']) > 20:
            session['powerbi_chat_history'] = session['powerbi_chat_history'][-20:]
        
        session.modified = True

        return jsonify({
            'answer': rag_result.get('response', rag_result.get('answer', 'No response generated')),
            'timestamp': conversation['timestamp'],
            'query_type': conversation['query_type'],
            'rag_details': rag_result,
            'status': 'success'
        }), 200

    except Exception as e:
        logger.error(f"Error processing user clarification: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'An error occurred while processing your clarification. Please try again.',
            'details': str(e) if config.DEBUG else None
        }), 500

@powerbi_chat_bp.route('/powerbi-chat/config', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def get_rag_config():
    """
    Get or update RAG configuration settings
    """
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        if request.method == 'GET':
            # Return current RAG configuration
            return jsonify({
                'enable_iterative_rag': config.ENABLE_ITERATIVE_RAG,
                'max_rag_iterations': config.MAX_RAG_ITERATIONS,
                'max_follow_up_queries_per_iteration': config.MAX_FOLLOW_UP_QUERIES_PER_ITERATION,
                'max_retrieval_docs': config.MAX_RETRIEVAL_DOCS,
                'rag_context_analysis_threshold': config.RAG_CONTEXT_ANALYSIS_THRESHOLD,
                'status': 'success'
            }), 200

        elif request.method == 'POST':
            # Update RAG configuration (for future implementation)
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No configuration data provided'}), 400

            # Note: In a production environment, you'd want to persist these changes
            # For now, we'll just return the current config
            logger.info(f"RAG configuration update requested: {data}")
            
            return jsonify({
                'message': 'Configuration update not implemented yet',
                'current_config': {
                    'enable_iterative_rag': config.ENABLE_ITERATIVE_RAG,
                    'max_rag_iterations': config.MAX_RAG_ITERATIONS,
                    'max_follow_up_queries_per_iteration': config.MAX_FOLLOW_UP_QUERIES_PER_ITERATION,
                    'max_retrieval_docs': config.MAX_RETRIEVAL_DOCS,
                    'rag_context_analysis_threshold': config.RAG_CONTEXT_ANALYSIS_THRESHOLD
                },
                'status': 'success'
            }), 200

    except Exception as e:
        logger.error(f"Error handling RAG config: {str(e)}")
        return jsonify({'error': 'Failed to handle configuration request'}), 500

@powerbi_chat_bp.route('/powerbi-chat/upload', methods=['POST', 'OPTIONS'])
@cross_origin()
def upload_powerbi_file():
    """
    Upload and analyze a Power BI file for context-aware chat
    """
    temp_file = None
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

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
        temp_file.close()

        # Extract metadata using RAG pipeline
        logger.info(f"Extracting metadata from uploaded file: {file.filename}")
        
        try:
            # Use the new PBIX parser for RAG pipeline
            metadata = pbix_parser.extract_metadata(temp_file.name)
            documents = pbix_parser.chunk_metadata(metadata)
        except Exception as parse_error:
            logger.error(f"Error parsing PBIX file: {str(parse_error)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'error': 'Failed to parse PBIX file',
                'details': str(parse_error) if config.DEBUG else None
            }), 500
        
        # Generate unique collection name for this PBIX file
        collection_name = rag_pipeline.generate_collection_name()
        
        # Prepare metadata for collection storage
        collection_metadata = {
            'filename': file.filename,
            'pbix_data': metadata,
            'upload_time': datetime.now().isoformat(),
            'file_size': os.path.getsize(temp_file.name),
            'upload_id': f"upload_{datetime.now().timestamp()}"
        }
        
        # Create vector store with metadata
        try:
            vector_store = rag_pipeline.create_vector_store(documents, collection_name, collection_metadata)
            logger.info(f"Successfully created vector store with {len(documents)} documents")
        except Exception as vector_error:
            logger.error(f"Error creating vector store: {str(vector_error)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'error': 'Failed to create vector store',
                'details': str(vector_error) if config.DEBUG else None
            }), 500

        # Generate unique upload ID
        upload_id = collection_metadata['upload_id']

        # Debug: Log the structure of extracted data
        logger.info(f"Extracted data structure:")
        logger.info(f"Tables: {metadata.get('tables', [])[:3]}")  # First 3 tables
        logger.info(f"Measures: {metadata.get('measures', [])[:3]}")  # First 3 measures
        logger.info(f"Relationships: {metadata.get('relationships', [])[:2]}")  # First 2 relationships
        
        # Store metadata in session (for backward compatibility)
        session[f"pbix_metadata_{upload_id}"] = {
            'filename': file.filename,
            'pbix_data': metadata,
            'collection_name': collection_name,
            'upload_time': collection_metadata['upload_time'],
            'file_size': collection_metadata['file_size']
        }
        session.modified = True

        # Prepare summary for response
        summary = {
            'tables_count': len(metadata.get('tables', [])),
            'measures_count': len(metadata.get('measures', [])),
            'relationships_count': len(metadata.get('relationships', [])),
            'columns_count': len(metadata.get('columns', [])),
            'documents_count': len(documents)
        }

        return jsonify({
            'upload_id': upload_id,
            'session_id': collection_name,  # Return collection name as session_id for RAG queries
            'filename': file.filename,
            'message': 'File uploaded and analyzed successfully',
            'metadata': summary,
            'status': 'success'
        }), 200

    except Exception as e:
        logger.error(f"Error uploading Power BI file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Failed to analyze Power BI file. Please try again.',
            'details': str(e) if config.DEBUG else None
        }), 500
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception as cleanup_error:
                logger.warning(f"Could not delete temporary file: {cleanup_error}")

@powerbi_chat_bp.route('/powerbi-chat/list-files', methods=['GET', 'OPTIONS'])
@cross_origin()
def list_uploaded_files():
    """
    List all previously uploaded PBIX files that are available for chat
    """
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        # Query the database directly to get collections with PBIX metadata
        import psycopg
        # Note: psycopg v3 doesn't have RealDictCursor in extras, using regular Cursor
        # from psycopg.extras import RealDictCursor
        
        uploaded_files = []
        
        try:
            # Connect to the database
            conn = psycopg.connect(config.NEON_CONNECTION_STRING)
            cursor = conn.cursor()
            
            # Query collections with their metadata and document counts
            query = """
            SELECT 
                c.uuid,
                c.name,
                c.cmetadata,
                c.created_at,
                c.updated_at,
                COUNT(e.id) as document_count
            FROM langchain_pg_collection c
            LEFT JOIN langchain_pg_embedding e ON c.uuid = e.collection_id
            WHERE c.cmetadata IS NOT NULL
            GROUP BY c.uuid, c.name, c.cmetadata, c.created_at, c.updated_at
            ORDER BY c.created_at DESC
            """
            
            cursor.execute(query)
            collections = cursor.fetchall()
            
            for collection in collections:
                try:
                    metadata = collection['cmetadata']
                    
                    # Check if this is a PBIX file (has our expected metadata structure)
                    if (metadata and 
                        metadata.get('filename') and 
                        metadata.get('pbix_data') and 
                        metadata.get('upload_time')):
                        
                        pbix_data = metadata.get('pbix_data', {})
                        summary = {
                            'tables_count': len(pbix_data.get('tables', [])),
                            'measures_count': len(pbix_data.get('measures', [])),
                            'relationships_count': len(pbix_data.get('relationships', [])),
                            'columns_count': len(pbix_data.get('columns', []))
                        }
                        
                        uploaded_files.append({
                            'collection_name': collection['name'],
                            'filename': metadata.get('filename'),
                            'upload_time': metadata.get('upload_time'),
                            'file_size': metadata.get('file_size', 0),
                            'metadata': summary,
                            'document_count': collection['document_count'],
                            'created_at': collection['created_at'].isoformat() if collection['created_at'] else None
                        })
                        
                except Exception as e:
                    logger.warning(f"Error processing collection {collection.get('name', 'unknown')}: {str(e)}")
                    continue
            
            cursor.close()
            conn.close()
            
        except Exception as db_error:
            logger.error(f"Database error listing files: {str(db_error)}")
            # Fallback to using the RAG pipeline method
            collections = rag_pipeline.list_collections()
            logger.info(f"Fallback: Found {len(collections)} collections via RAG pipeline")
            
            # For fallback, we can only return basic info
            for collection_name in collections:
                uploaded_files.append({
                    'collection_name': collection_name,
                    'filename': f"File from {collection_name}",
                    'upload_time': None,
                    'file_size': 0,
                    'metadata': {
                        'tables_count': 0,
                        'measures_count': 0,
                        'relationships_count': 0,
                        'columns_count': 0
                    },
                    'document_count': 0,
                    'created_at': None
                })
        
        return jsonify({
            'files': uploaded_files,
            'total_count': len(uploaded_files),
            'status': 'success'
        }), 200

    except Exception as e:
        logger.error(f"Error listing uploaded files: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Failed to retrieve uploaded files',
            'details': str(e) if config.DEBUG else None
        }), 500

def enhance_query_with_clarifications(original_query, clarifications):
    """
    Enhance the original query with user clarifications to provide more context
    """
    try:
        if not clarifications:
            return original_query
            
        # Create an enhanced query that includes the clarifications
        clarifications_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in clarifications.items()])
        
        enhanced_query = f"""
        {original_query}
        
        Additional clarifications provided:
        {clarifications_text}
        
        Please provide a comprehensive response based on the original query and the clarifications above.
        """
        
        return enhanced_query
        
    except Exception as e:
        logger.error(f"Error enhancing query with clarifications: {str(e)}")
        # Return original query if enhancement fails
        return original_query

def enhance_response_with_clarifications(response, clarifications, original_query):
    """
    Enhance the AI response with user clarifications using Gemini
    """
    try:
        # Configure the model for Power BI expertise
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build clarifications context
        clarifications_context = ""
        if clarifications:
            clarifications_context = "\nUser Clarifications:\n"
            for question, answer in clarifications.items():
                clarifications_context += f"Q: {question}\nA: {answer}\n\n"
        
        # Create enhancement prompt
        enhancement_prompt = f"""
You are a Power BI expert assistant. You have received a response to a user's question, and now you have additional clarifications from the user.

Original Question: {original_query}

Your Previous Response:
{response}

{clarifications_context}

Please enhance your previous response by incorporating the user's clarifications. Make the response more specific and tailored to their exact needs based on their clarifications.

Guidelines:
1. Keep the technical accuracy of your original response
2. Incorporate the user's clarifications to make the response more specific
3. If the clarifications change the approach, explain the updated approach
4. Maintain the step-by-step structure but adapt it to their specific requirements
5. Reference their clarifications when relevant
6. Keep the response focused and actionable

Please provide an enhanced response that incorporates the user's clarifications.
"""

        enhanced_response = model.generate_content(enhancement_prompt)
        
        if enhanced_response.text:
            return enhanced_response.text.strip()
        else:
            # Fallback to original response if enhancement fails
            return response

    except Exception as e:
        logger.error(f"Error enhancing response with clarifications: {str(e)}")
        # Return original response if enhancement fails
        return response

def generate_powerbi_response(query, chat_history=None, pbix_metadata=None):
    """
    Generate a response to a Power BI query using Gemini AI with optional PBIX context
    """
    try:
        # Configure the model for Power BI expertise
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build context from chat history
        context = ""
        if chat_history and len(chat_history) > 0:
            context = "\nPrevious conversation context:\n"
            for conversation in chat_history[-3:]:  # Last 3 conversations for context
                context += f"User: {conversation['user_query']}\n"
                context += f"Assistant: {conversation['assistant_response'][:200]}...\n\n"

        # Build PBIX context if available
        pbix_context = ""
        if pbix_metadata:
            pbix_data = pbix_metadata.get('pbix_data', {})
            filename = pbix_metadata.get('filename', 'Unknown')
            
            pbix_context = f"\nCurrent Power BI File Context: {filename}\n"
            
            # Extract table names from DAX tables and measures
            tables = pbix_data.get('tables', [])  # This is dax_tables from the working service
            measures = pbix_data.get('dax_measures', [])
            
            # Get table names from dax_tables data
            table_names = set()
            if tables:
                for table in tables:
                    table_name = table.get('Name') or table.get('TableName')
                    if table_name:
                        table_names.add(table_name)
            
            # Also extract table names from DAX measure expressions (backup method)
            if measures:
                import re
                for measure in measures:
                    expression = measure.get('Expression', '')
                    if expression:
                        # Extract table names from DAX expressions using single quotes
                        table_matches = re.findall(r"'([^']+)'", expression)
                        for match in table_matches:
                            if match and not match.isdigit() and len(match) > 2:  # Filter out numbers and short strings
                                table_names.add(match)
            
            # Convert to sorted list
            table_names_list = sorted(list(table_names))
            
            if table_names_list:
                pbix_context += f"\nTables ({len(table_names_list)}):\n"
                for table_name in table_names_list[:10]:  # Limit to first 10 tables
                    pbix_context += f"- {table_name}\n"
                
                if len(table_names_list) > 10:
                    pbix_context += f"... and {len(table_names_list) - 10} more tables\n"
            
            # Add measures information
            measures = pbix_data.get('dax_measures', [])
            if measures:
                pbix_context += f"\nDAX Measures ({len(measures)}):\n"
                for measure in measures[:10]:  # Limit to first 10 measures
                    measure_name = measure.get('Name', 'Unknown')
                    measure_expression = measure.get('Expression', '')
                    pbix_context += f"- {measure_name}: {measure_expression[:100]}{'...' if len(measure_expression) > 100 else ''}\n"
                if len(measures) > 10:
                    pbix_context += f"... and {len(measures) - 10} more measures\n"
            
            # Add relationships information
            relationships = pbix_data.get('relationships', [])
            if relationships:
                pbix_context += f"\nRelationships ({len(relationships)}):\n"
                for rel in relationships[:5]:  # Limit to first 5 relationships
                    # Try different field names that might exist in the relationship data
                    from_table = rel.get('FromTable') or rel.get('FromTableName') or rel.get('from_table') or 'Unknown'
                    to_table = rel.get('ToTable') or rel.get('ToTableName') or rel.get('to_table') or 'Unknown'
                    from_column = rel.get('FromColumn') or rel.get('FromColumnName') or rel.get('from_column') or 'Unknown'
                    to_column = rel.get('ToColumn') or rel.get('ToColumnName') or rel.get('to_column') or 'Unknown'
                    
                    # If still unknown, try to extract from other fields
                    if from_table == 'Unknown' and 'Name' in rel:
                        # Sometimes relationship name contains table info
                        rel_name = rel.get('Name', '')
                        pbix_context += f"- Relationship: {rel_name}\n"
                    else:
                        pbix_context += f"- {from_table}[{from_column}] -> {to_table}[{to_column}]\n"
                        
                if len(relationships) > 5:
                    pbix_context += f"... and {len(relationships) - 5} more relationships\n"

        # Create a comprehensive prompt for Power BI assistance
        system_prompt = """
You are a Power BI expert assistant. You help users with Power BI questions, including:

- Creating DAX measures and calculated columns
- Data modeling best practices
- Troubleshooting Power BI issues
- Performance optimization
- Visualization recommendations
- Security and governance
- Power Query (M) language
- Report design best practices

Guidelines for your responses:
1. Be specific and actionable
2. Provide step-by-step instructions when appropriate
3. Include DAX code examples with explanations when relevant
4. Mention potential pitfalls or common mistakes
5. Suggest best practices
6. Keep responses concise but comprehensive
7. If you have specific information about the user's Power BI file, reference it in your response
8. If you need more context, ask clarifying questions

Current user query: {query}
{context}
{pbix_context}

Please provide a helpful, detailed response focused on Power BI.
"""

        prompt = system_prompt.format(query=query, context=context, pbix_context=pbix_context)
        logger.info(f"Prompt: {prompt}")
        response = model.generate_content(prompt)
        
        if response.text:
            return response.text.strip()
        else:
            return "I apologize, but I couldn't generate a response to your Power BI question. Please try rephrasing your question or provide more specific details."

    except Exception as e:
        logger.error(f"Error generating Power BI response: {str(e)}")
        return "I apologize, but I encountered an error while processing your Power BI question. Please try again later."

def classify_powerbi_query(query):
    """
    Classify the type of Power BI query for analytics
    """
    query_lower = query.lower()
    
    if any(keyword in query_lower for keyword in ['measure', 'dax', 'calculate', 'sum', 'average', 'count']):
        return 'measures_dax'
    elif any(keyword in query_lower for keyword in ['relationship', 'model', 'table', 'column']):
        return 'data_modeling'
    elif any(keyword in query_lower for keyword in ['performance', 'slow', 'optimize', 'speed']):
        return 'performance'
    elif any(keyword in query_lower for keyword in ['visual', 'chart', 'graph', 'visualization']):
        return 'visualization'
    elif any(keyword in query_lower for keyword in ['error', 'issue', 'problem', 'fix', 'troubleshoot']):
        return 'troubleshooting'
    elif any(keyword in query_lower for keyword in ['security', 'rls', 'permission', 'access']):
        return 'security'
    elif any(keyword in query_lower for keyword in ['power query', 'transform', 'etl', 'm language']):
        return 'power_query'
    else:
        return 'general' 
