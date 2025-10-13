# app/powerbi_chat/services/rag_orchestration_service.py

import logging
import json
import re
from typing import Dict, Any, List, Tuple, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.powerbi_chat.services.llm_service import llm_service
from app.powerbi_chat.services.vector_store_service import vector_store_service
from app.powerbi_chat.prompts import CONTEXT_ANALYSIS_PROMPT, FINAL_RESPONSE_PROMPT

logger = logging.getLogger(__name__)

class RAGResult:
    def __init__(self, status: str, data: Dict[str, Any]):
        self.status = status
        self.data = data

class RAGOrchestrationService:
    """Orchestrates the iterative RAG process."""

    def __init__(self):
        self.llm = llm_service.llm

    def start_query(self, collection_name: str, query: str, update_callback: Callable = None) -> RAGResult:
        """
        Starts the RAG process and uses a callback to send real-time updates.
        """
        def send_update(step, message, details=None):
            if update_callback:
                update_payload = {"type": "update", "step": step, "message": message}
                if details:
                    update_payload.update(details)
                update_callback(update_payload)

        logger.info(f"Starting orchestration for query on '{collection_name}'")
        retriever = vector_store_service.get_retriever(collection_name)
        
        send_update("initial_retrieval", "Retrieving initial documents from your PBIX file...")
        initial_docs = retriever.invoke(query)
        initial_context = self._format_docs(initial_docs)
        
        if not initial_context:
            # This is a much more helpful and user-friendly question.
            user_friendly_question = [
                "I couldn't find any information related to your question in the PBIX file. Could you please rephrase it, or ask about a specific table, column, or measure?"
            ]
            return RAGResult("NEEDS_CLARIFICATION", {"user_clarifications": user_friendly_question, "context_for_continuation": {"collection_name": collection_name, "original_query": query, "initial_context": ""}})

        send_update("context_analysis", "Analyzing context to see if more information is needed...")
        sufficient, follow_up, clarifications = self._analyze_context(query, initial_context)
        
        if clarifications:
            send_update("clarification_required", "User input is needed to provide the best answer.", {"follow_up_queries": follow_up})
            pre_fetched_context = self._format_docs(self._retrieve_parallel(retriever, follow_up))
            return RAGResult("NEEDS_CLARIFICATION", {"user_clarifications": clarifications, "context_for_continuation": {"collection_name": collection_name, "original_query": query, "initial_context": initial_context, "pre_fetched_context": pre_fetched_context}})
        
        if follow_up:
            send_update("follow_up_retrieval", "Retrieving additional context...", {"follow_up_queries": follow_up})
            
            # Send individual search generation updates
            for i, query in enumerate(follow_up):
                search_id = f"search_{i}_{hash(query) % 10000}"
                send_update("search_generated", f"Search: {query}", {
                    "search_query": query,
                    "search_id": search_id
                })
            
            # Execute searches and send completion updates
            additional_docs = self._retrieve_parallel(retriever, follow_up)
            for i, query in enumerate(follow_up):
                search_id = f"search_{i}_{hash(query) % 10000}"
                # Count documents that match this specific query
                query_docs = [doc for doc in additional_docs if query.lower() in doc.page_content.lower()]
                result_count = len(query_docs) if query_docs else 0
                send_update("search_completed", f"Search completed: {query}", {
                    "search_id": search_id,
                    "result_count": result_count
                })
            
            final_context = initial_context + "\n\n--- Additional Context ---\n\n" + self._format_docs(additional_docs)
        else:
            final_context = initial_context
        
        send_update("final_generation", "Generating the final answer...")
        return RAGResult("COMPLETE", {"answer": self._generate_final_response(query, final_context)})

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
        
        full_context = (f"{context['initial_context']}\n\n"
                        f"--- Pre-fetched Context ---\n{context.get('pre_fetched_context', '')}\n\n"
                        f"--- User Clarifications ---\n" + "\n".join([f"Q: {q}\nA: {a}" for q, a in clarifications.items()]))
        
        send_update("final_generation", "Generating the final answer with your clarifications...")
        final_response = self._generate_final_response(context['original_query'], full_context)
        return RAGResult("COMPLETE", {"answer": final_response})

    # ... (rest of the methods _analyze_context, _generate_final_response, etc. remain unchanged) ...
    def _analyze_context(self, q: str, ctx: str) -> Tuple[bool, List[str], List[str]]:
        chain = PromptTemplate(template=CONTEXT_ANALYSIS_PROMPT, input_variables=["context", "question"]) | self.llm | StrOutputParser()
        response = chain.invoke({"question": q, "context": ctx})
        try:
            data = json.loads(re.search(r'\{.*\}', response, re.DOTALL).group())
            return not bool(data.get("user_clarifications")), data.get("follow_up_queries", []), data.get("user_clarifications", [])
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse JSON from context analysis, assuming context is sufficient.")
            return True, [], []

    def _generate_final_response(self, query: str, context: str) -> str:
        chain = PromptTemplate(template=FINAL_RESPONSE_PROMPT, input_variables=["context", "question"]) | self.llm | StrOutputParser()
        return chain.invoke({"question": query, "context": context})

    def _format_docs(self, docs: List) -> str: return "\n\n".join([doc.page_content for doc in docs])

    def _retrieve_parallel(self, retriever, queries: List[str]) -> List:
        if not queries: return []
        with ThreadPoolExecutor() as executor:
            docs = [doc for future in as_completed([executor.submit(retriever.invoke, q) for q in queries]) for doc in future.result()]
        return list({doc.page_content: doc for doc in docs}.values())


rag_orchestration_service = RAGOrchestrationService()