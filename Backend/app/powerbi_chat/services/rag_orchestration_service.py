# app/powerbi_chat/services/rag_orchestration_service.py

import logging
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.powerbi_chat.services.llm_service import llm_service
from app.powerbi_chat.services.vector_store_service import vector_store_service
from app.powerbi_chat.prompts import CONTEXT_ANALYSIS_PROMPT, FINAL_RESPONSE_PROMPT
from app.powerbi_chat.caching.cache_manager import cache_manager

logger = logging.getLogger(__name__)

class RAGResult:
    def __init__(self, status: str, data: Dict[str, Any]):
        self.status = status
        self.data = data

class RAGOrchestrationService:
    """Orchestrates the iterative RAG process."""

    def __init__(self):
        self.llm = llm_service.llm
        self.token_usage_tracker = {
            'context_analysis_tokens': 0,
            'final_response_tokens': 0,
            'context_analysis_input_tokens': 0,
            'context_analysis_output_tokens': 0,
            'context_analysis_overhead_tokens': 0,
            'final_response_input_tokens': 0,
            'final_response_output_tokens': 0,
            'final_response_overhead_tokens': 0,
            'total_retrieval_operations': 0,
            'total_documents_retrieved': 0
        }

    def start_query(self, collection_name: str, query: str, update_callback: Callable = None, conversation_history: List[Dict] = None) -> RAGResult:
        """
        Starts the RAG process and uses a callback to send real-time updates.
        """
        def send_update(step, message, details=None):
            if update_callback:
                update_payload = {"type": "update", "step": step, "message": message}
                if details:
                    update_payload.update(details)
                update_callback(update_payload)
            else:
                logger.warning("No update_callback provided to orchestration service")

        logger.info(f"Starting orchestration for query on '{collection_name}'")
        self._reset_token_tracker()
        retriever = vector_store_service.get_retriever(collection_name)
        
        # Build conversation context from history
        conversation_context = ""
        previous_rag_contexts = []
        
        if conversation_history:
            for message in conversation_history:
                if message.get('role') == 'assistant' and message.get('ragContextKey'):
                    # Retrieve previous RAG context from cache
                    cached_context = cache_manager.get(message['ragContextKey'], delete_after_retrieval=False)
                    if cached_context:
                        previous_rag_contexts.append(cached_context)
                
                # Add conversation messages to context
                role = message.get('role', 'unknown')
                content = message.get('content', '')
                if role in ['user', 'assistant', 'system']:
                    conversation_context += f"{role.upper()}: {content}\n\n"
        send_update("initial_retrieval", "Retrieving initial documents from your PBIX file...")
        initial_docs = retriever.invoke(query)
        vector_store_service.log_retrieval_operation(query, len(initial_docs), "initial_retrieval")
        self.token_usage_tracker['total_retrieval_operations'] += 1
        self.token_usage_tracker['total_documents_retrieved'] += len(initial_docs)
        initial_context = self._format_docs(initial_docs)
        
        # Combine conversation context with initial retrieval
        if conversation_context:
            initial_context = f"--- Previous Conversation ---\n{conversation_context}\n--- Current Query Context ---\n{initial_context}"
        
        if not initial_context:
            # This is a much more helpful and user-friendly question.
            user_friendly_question = [
                "I couldn't find any information related to your question in the PBIX file. Could you please rephrase it, or ask about a specific table, column, or measure?"
            ]
            return RAGResult("NEEDS_CLARIFICATION", {"user_clarifications": user_friendly_question, "context_for_continuation": {"collection_name": collection_name, "original_query": query, "initial_context": ""}})

        send_update("context_analysis", "Analyzing context to see if more information is needed...")
        
        sufficient, follow_up, clarifications = self._analyze_context(query, initial_context)
        
        # Handle search steps first, even if clarifications are needed
        if not sufficient and follow_up:
            send_update("follow_up_retrieval", "Retrieving additional context...", {"follow_up_queries": follow_up})
            
            # Send individual search generation updates
            for i, follow_up_query in enumerate(follow_up):
                # Skip empty queries
                if not follow_up_query or not follow_up_query.strip():
                    logger.warning(f"Skipping empty follow-up query at index {i}")
                    continue
                    
                search_id = f"search_{i}_{hash(follow_up_query) % 10000}"
                send_update("search_generated", f"Search: {follow_up_query}", {
                    "search_query": follow_up_query,
                    "search_id": search_id
                })
            
            # Execute searches and send completion updates
            logger.info("Executing parallel search retrieval...")
            additional_docs = self._retrieve_parallel(retriever, follow_up)
            
            # Log retrieval operations for follow-up queries
            for i, follow_up_query in enumerate(follow_up):
                if follow_up_query and follow_up_query.strip():
                    query_docs = retriever.invoke(follow_up_query)
                    vector_store_service.log_retrieval_operation(follow_up_query, len(query_docs), f"follow_up_search_{i}")
                    self.token_usage_tracker['total_retrieval_operations'] += 1
                    self.token_usage_tracker['total_documents_retrieved'] += len(query_docs)
            
            # Count results per query by running individual retrievals
            for i, follow_up_query in enumerate(follow_up):
                # Skip empty queries
                if not follow_up_query or not follow_up_query.strip():
                    logger.warning(f"Skipping empty follow-up query at index {i} in completion loop")
                    continue
                    
                search_id = f"search_{i}_{hash(follow_up_query) % 10000}"
                # Get documents for this specific query
                query_docs = retriever.invoke(follow_up_query)
                result_count = len(query_docs) if query_docs else 0
                send_update("search_completed", f"Search completed: {follow_up_query}", {
                    "search_id": search_id,
                    "result_count": result_count
                })
            
            final_context = initial_context + "\n\n--- Additional Context ---\n\n" + self._format_docs(additional_docs)
        else:
            final_context = initial_context
        
        # After search steps, check if clarifications are still needed
        if clarifications:
            send_update("clarification_required", "User input is needed to provide the best answer.", {"follow_up_queries": follow_up})
            pre_fetched_context = self._format_docs(self._retrieve_parallel(retriever, follow_up)) if follow_up else ""
            return RAGResult("NEEDS_CLARIFICATION", {"user_clarifications": clarifications, "context_for_continuation": {"collection_name": collection_name, "original_query": query, "initial_context": final_context, "pre_fetched_context": pre_fetched_context}})
        
        send_update("final_generation", "Generating the final answer...")
        
        # Generate final response
        final_answer = self._generate_final_response(query, final_context)
        
        # Cache the RAG context for potential follow-up questions
        rag_context_key = cache_manager.set({
            'context': final_context,
            'query': query,
            'timestamp': datetime.now().isoformat()
        })
        
        # Log comprehensive token usage summary
        self._log_token_usage_summary("query_completion")
        
        return RAGResult("COMPLETE", {
            "answer": final_answer,
            "rag_context_key": rag_context_key
        })

    def continue_with_clarifications(self, context: Dict[str, Any], clarifications: Dict[str, str], update_callback: Callable = None) -> RAGResult:
        """
        Continues the RAG process after clarifications and sends updates.
        """
        def send_update(step, message, details=None):
            if update_callback:
                update_payload = {"type": "update", "step": step, "message": message}
                if details:
                    update_payload.update(details)
                update_callback(update_payload)
        
        send_update("processing_clarifications", "Applying your answers to enrich the context...")
        logger.info("Generating final response with enriched context from user clarifications.")
        
        # Reset token tracker for clarification processing
        self._reset_token_tracker()
        
        full_context = (f"{context['initial_context']}\n\n"
                        f"--- Pre-fetched Context ---\n{context.get('pre_fetched_context', '')}\n\n"
                        f"--- User Clarifications ---\n" + "\n".join([f"Q: {q}\nA: {a}" for q, a in clarifications.items()]))
        
        send_update("final_generation", "Generating the final answer with your clarifications...")
        final_response = self._generate_final_response(context['original_query'], full_context)
        
        # Cache the RAG context for potential follow-up questions
        rag_context_key = cache_manager.set({
            'context': full_context,
            'query': context['original_query'],
            'timestamp': datetime.now().isoformat()
        })
        
        # Log comprehensive token usage summary for clarification processing
        self._log_token_usage_summary("clarification_processing")
        
        return RAGResult("COMPLETE", {
            "answer": final_response,
            "rag_context_key": rag_context_key
        })

    def _analyze_context(self, q: str, ctx: str) -> Tuple[bool, List[str], List[str]]:
        # Create the chain but invoke LLM directly to preserve metadata
        prompt = PromptTemplate(template=CONTEXT_ANALYSIS_PROMPT, input_variables=["context", "question"])
        formatted_prompt = prompt.format(question=q, context=ctx)
        
        # Use the enhanced logging method from LLM service
        llm_response = llm_service.invoke_with_logging(formatted_prompt, "context_analysis", self.token_usage_tracker)
        
        # Parse the response content
        response = llm_response.content

        try:
            data = json.loads(re.search(r'\{.*\}', response, re.DOTALL).group())
            
            # Check if context is sufficient based on the 'sufficient' field
            sufficient = data.get("sufficient", True)
            follow_up_queries = data.get("follow_up_queries", [])
            user_clarifications = data.get("user_clarifications", [])
            
            # Filter out empty or invalid follow-up queries
            follow_up_queries = [q.strip() for q in follow_up_queries if q and q.strip()]
            user_clarifications = [c.strip() for c in user_clarifications if c and c.strip()]
            
            logger.info(f"Context sufficient: {sufficient}, follow_up_queries: {len(follow_up_queries)}, user_clarifications: {len(user_clarifications)}")
            
            return sufficient, follow_up_queries, user_clarifications
        except (json.JSONDecodeError, AttributeError) as e:
            logger.warning(f"Failed to parse JSON from context analysis: {e}")
            return True, [], []

    def _generate_final_response(self, query: str, context: str) -> str:
        # Create the chain but invoke LLM directly to preserve metadata
        prompt = PromptTemplate(template=FINAL_RESPONSE_PROMPT, input_variables=["context", "question"])
        formatted_prompt = prompt.format(question=query, context=context)
        
        # Use the enhanced logging method from LLM service
        llm_response = llm_service.invoke_with_logging(formatted_prompt, "final_response_generation", self.token_usage_tracker)
        
        return llm_response.content

    def _format_docs(self, docs: List) -> str: return "\n\n".join([doc.page_content for doc in docs])

    def _retrieve_parallel(self, retriever, queries: List[str]) -> List:
        if not queries: return []
        with ThreadPoolExecutor() as executor:
            docs = [doc for future in as_completed([executor.submit(retriever.invoke, q) for q in queries]) for doc in future.result()]
        return list({doc.page_content: doc for doc in docs}.values())

    def _reset_token_tracker(self):
        """Reset the token usage tracker for a new query."""
        self.token_usage_tracker = {
            'context_analysis_tokens': 0,
            'final_response_tokens': 0,
            'context_analysis_input_tokens': 0,
            'context_analysis_output_tokens': 0,
            'context_analysis_overhead_tokens': 0,
            'final_response_input_tokens': 0,
            'final_response_output_tokens': 0,
            'final_response_overhead_tokens': 0,
            'total_retrieval_operations': 0,
            'total_documents_retrieved': 0
        }

    def _log_token_usage_summary(self, operation: str):
        """Log a simplified token usage summary."""
        total_tokens = (self.token_usage_tracker['context_analysis_tokens'] + 
                       self.token_usage_tracker['final_response_tokens'])
        
        total_input_tokens = (self.token_usage_tracker['context_analysis_input_tokens'] + 
                             self.token_usage_tracker['final_response_input_tokens'])
        
        total_output_tokens = (self.token_usage_tracker['context_analysis_output_tokens'] + 
                              self.token_usage_tracker['final_response_output_tokens'])
        
        total_overhead_tokens = (self.token_usage_tracker['context_analysis_overhead_tokens'] + 
                                self.token_usage_tracker['final_response_overhead_tokens'])
        
        if total_overhead_tokens > 0:
            logger.info(f"📈 {operation}: {total_tokens} total tokens ({total_input_tokens} input + {total_output_tokens} output + {total_overhead_tokens} overhead) | "
                       f"{self.token_usage_tracker['total_retrieval_operations']} retrievals | "
                       f"{self.token_usage_tracker['total_documents_retrieved']} docs")
        else:
            logger.info(f"📈 {operation}: {total_tokens} total tokens ({total_input_tokens} input + {total_output_tokens} output) | "
                       f"{self.token_usage_tracker['total_retrieval_operations']} retrievals | "
                       f"{self.token_usage_tracker['total_documents_retrieved']} docs")


rag_orchestration_service = RAGOrchestrationService()