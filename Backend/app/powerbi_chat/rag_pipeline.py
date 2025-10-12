"""
RAG Pipeline Service for Power BI Chat

This module implements the Retrieval-Augmented Generation pipeline
for Power BI chat using LangChain and pgvector.
"""

import logging
import uuid
import traceback
import warnings
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# Use the new LangChain postgres imports (replaces deprecated langchain_community.vectorstores.pgvector)
from langchain_core.documents import Document
from langchain_postgres import PGVector
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from app.config.settings import config

logger = logging.getLogger(__name__)

class RAGPipeline:
    """
    RAG Pipeline for Power BI chat using LangChain and pgvector.
    """
    
    def __init__(self):
        """Initialize the RAG pipeline with embeddings and LLM models."""
        try:
            # Validate API key
            if not config.GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY not configured")
            
            # Initialize Google Generative AI embeddings
            # Ensure model name has the correct prefix
            embedding_model_name = config.VECTOR_EMBEDDING_MODEL
            if not embedding_model_name.startswith('models/'):
                embedding_model_name = f"models/{embedding_model_name}"
            
            logger.info(f"Initializing embedding model: {embedding_model_name}")
            try:
                self.embedding_model = GoogleGenerativeAIEmbeddings(
                    model=embedding_model_name,
                    google_api_key=config.GOOGLE_API_KEY
                )
                logger.info("Embedding model initialized successfully")
            except Exception as embed_init_error:
                logger.error(f"Failed to initialize embedding model: {str(embed_init_error)}")
                # Try with a different model name format
                if embedding_model_name == "models/text-embedding-004":
                    logger.info("Trying alternative model name format...")
                    self.embedding_model = GoogleGenerativeAIEmbeddings(
                        model="text-embedding-004",
                        google_api_key=config.GOOGLE_API_KEY
                    )
                else:
                    raise embed_init_error
            
            # Initialize Google Generative AI LLM
            # Ensure model name has the correct prefix
            llm_model_name = config.RAG_LLM_MODEL
            if not llm_model_name.startswith('models/'):
                llm_model_name = f"models/{llm_model_name}"
            
            logger.info(f"Initializing LLM model: {llm_model_name}")
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model=llm_model_name,
                    google_api_key=config.GOOGLE_API_KEY,
                    temperature=0.1
                )
                logger.info("LLM model initialized successfully")
            except Exception as llm_init_error:
                logger.error(f"Failed to initialize LLM model: {str(llm_init_error)}")
                # Try with a different model name format
                if llm_model_name == "models/gemini-2.5-flash":
                    logger.info("Trying alternative LLM model name format...")
                    self.llm = ChatGoogleGenerativeAI(
                        model="gemini-2.5-flash",
                        google_api_key=config.GOOGLE_API_KEY,
                        temperature=0.1
                    )
                else:
                    raise llm_init_error
            
            logger.info("RAG Pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing RAG Pipeline: {str(e)}")
            raise
    
    def create_vector_store(self, docs: List[Document], collection_name: str, collection_metadata: dict = None) -> PGVector:
        """
        Create a vector store from documents and store in Neon database.
        
        Args:
            docs: List of LangChain Document objects
            collection_name: Unique collection name for this PBIX file
            collection_metadata: Optional metadata to store with the collection
            
        Returns:
            PGVector instance for the created vector store
        """
        try:
            logger.info(f"Creating vector store with {len(docs)} documents for collection: {collection_name}")
            
            # Validate connection string
            if not config.NEON_CONNECTION_STRING:
                raise ValueError("NEON_CONNECTION_STRING not configured")
            
            # Validate documents
            if not docs:
                raise ValueError("No documents provided for vector store creation")
            
            # Test embedding model with a sample document
            logger.info("Testing embedding model with sample document...")
            try:
                test_embedding = self.embedding_model.embed_query("test")
                logger.info(f"Embedding model test successful, embedding dimension: {len(test_embedding)}")
            except Exception as embed_error:
                logger.error(f"Embedding model test failed: {str(embed_error)}")
                raise ValueError(f"Embedding model not working: {str(embed_error)}")
            
            # Create vector store using PGVector (new langchain_postgres implementation)
            logger.info("Creating PGVector store...")
            vector_store = PGVector.from_documents(
                documents=docs,
                embedding=self.embedding_model,
                collection_name=collection_name,
                connection=config.NEON_CONNECTION_STRING
            )
            
            # Store metadata in the collection if provided
            if collection_metadata:
                try:
                    logger.info(f"Storing metadata for collection: {collection_name}")
                    # Update the collection with metadata
                    vector_store._collection_metadata = collection_metadata
                    # Use the collection's update method if available
                    if hasattr(vector_store, 'update_collection_metadata'):
                        vector_store.update_collection_metadata(collection_metadata)
                    else:
                        # Fallback: manually update the collection metadata in the database
                        import psycopg
                        # Note: psycopg v3 doesn't have Json in extras, using json.dumps
                        # from psycopg.extras import Json
                        import json
                        
                        conn = psycopg.connect(config.NEON_CONNECTION_STRING)
                        cursor = conn.cursor()
                        
                        # Update the collection metadata
                        cursor.execute(
                            "UPDATE langchain_pg_collection SET cmetadata = %s WHERE name = %s",
                            (json.dumps(collection_metadata), collection_name)
                        )
                        
                        conn.commit()
                        # cursor.close()
                        # conn.close()
                        
                        logger.info(f"Successfully stored metadata for collection: {collection_name}")
                        
                except Exception as meta_error:
                    logger.warning(f"Failed to store collection metadata: {str(meta_error)}")
                    # Continue without failing the entire operation
            
            logger.info(f"Successfully created vector store for collection: {collection_name}")
            return vector_store
            
        except Exception as e:
            logger.error(f"Error creating vector store: {str(e)}")
            raise
    
    def create_rag_chain(self, collection_name: str) -> Any:
        """
        Create a RAG chain for querying a specific collection.
        
        Args:
            collection_name: The collection name to query
            
        Returns:
            Runnable RAG chain
        """
        try:
            logger.info(f"Creating RAG chain for collection: {collection_name}")
            
            # Connect to existing vector store
            logger.info(f"Connecting to vector store with collection: {collection_name}")
            vector_store = PGVector(
                embeddings=self.embedding_model,
                collection_name=collection_name,
                connection=config.NEON_CONNECTION_STRING
            )
            
            # Create retriever
            logger.info(f"Creating retriever with k={config.MAX_RETRIEVAL_DOCS}")
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": config.MAX_RETRIEVAL_DOCS}
            )
            
            # Define the prompt template (brief rules to reduce token usage)
            prompt_template = """
You are a Power BI expert assistant.

Context:
{context}

Question: {question}

Rules:
- Use Markdown.
- Put only full DAX formulas in fenced blocks (```dax ... ```).
- Keep table/column/measure names inline in backticks (e.g., `Table[Column]`).
- Avoid unnecessary line breaks inside sentences and bullets.

Provide a clear, step-by-step answer.
"""
            
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            
            # Create the RAG chain using LangChain Expression Language (LCEL)
            logger.info("Building RAG chain with LCEL...")
            rag_chain = (
                {"context": retriever | self._format_docs, "question": RunnablePassthrough()}
                | prompt
                | self.llm
                | StrOutputParser()
            )
            
            logger.info(f"Successfully created RAG chain for collection: {collection_name}")
            return rag_chain
            
        except Exception as e:
            logger.error(f"Error creating RAG chain: {str(e)}")
            raise
    
    def _format_docs(self, docs: List[Document]) -> str:
        """
        Format retrieved documents for the prompt.
        
        Args:
            docs: List of retrieved documents
            
        Returns:
            Formatted string of document contents
        """
        try:
            logger.info(f"Formatting {len(docs)} retrieved documents")
            formatted_docs = []
            for i, doc in enumerate(docs):
                logger.info(f"Document {i+1}: {doc.page_content[:100]}...")
                #logger.info(f"Document {i+1} metadata: {doc.metadata}")
                
                # Add source information to each document
                source_info = ""
                if doc.metadata.get("type") == "table":
                    source_info = f" [Table: {doc.metadata.get('table_name', 'Unknown')}]"
                elif doc.metadata.get("type") == "column":
                    source_info = f" [Column: {doc.metadata.get('column_name', 'Unknown')} in {doc.metadata.get('table_name', 'Unknown')}]"
                elif doc.metadata.get("type") == "measure":
                    source_info = f" [Measure: {doc.metadata.get('measure_name', 'Unknown')} in {doc.metadata.get('table_name', 'Unknown')}]"
                elif doc.metadata.get("type") == "relationship":
                    source_info = f" [Relationship: {doc.metadata.get('from_table', 'Unknown')} -> {doc.metadata.get('to_table', 'Unknown')}]"
                elif doc.metadata.get("type") == "power_query":
                    source_info = f" [Power Query: {doc.metadata.get('script_name', 'Unknown')} from {doc.metadata.get('data_source', 'Unknown')}]"
                
                formatted_docs.append(f"{doc.page_content}{source_info}")
            
            result = "\n\n".join(formatted_docs)
            logger.info(f"Formatted context length: {len(result)} characters")
            return result
            
        except Exception as e:
            logger.error(f"Error formatting documents: {str(e)}")
            return "\n".join([doc.page_content for doc in docs])
    
    def _retrieve_documents_for_query(self, retriever, query: str, query_index: int) -> tuple[int, List[Document], str]:
        """
        Retrieve documents for a single follow-up query.
        This function is designed to be used with ThreadPoolExecutor.
        
        Args:
            retriever: The retriever instance
            query: The follow-up query
            query_index: Index of the query for ordering
            
        Returns:
            Tuple of (query_index, documents, query) for proper ordering
        """
        try:
            logger.info(f"Retrieving documents for follow-up query {query_index + 1}: {query[:100]}...")
            docs = retriever.get_relevant_documents(query)
            logger.info(f"Retrieved {len(docs)} documents for query {query_index + 1}")
            return query_index, docs, query
        except Exception as e:
            logger.error(f"Error retrieving documents for query {query_index + 1}: {str(e)}")
            return query_index, [], query
    
    def _retrieve_documents_parallel(self, retriever, follow_up_queries: List[str], max_workers: int = 4) -> List[Document]:
        """
        Retrieve documents for multiple follow-up queries in parallel.
        
        Args:
            retriever: The retriever instance
            follow_up_queries: List of follow-up queries to process
            max_workers: Maximum number of worker threads (default: 4)
            
        Returns:
            List of all retrieved documents (deduplicated)
        """
        try:
            if not follow_up_queries:
                return []
            
            logger.info(f"Starting parallel retrieval for {len(follow_up_queries)} follow-up queries with {max_workers} workers")
            
            # Use ThreadPoolExecutor for parallel execution
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all retrieval tasks
                future_to_query = {
                    executor.submit(self._retrieve_documents_for_query, retriever, query, i): (i, query)
                    for i, query in enumerate(follow_up_queries)
                }
                
                # Collect results as they complete
                results = []
                for future in as_completed(future_to_query):
                    try:
                        query_index, docs, query = future.result()
                        results.append((query_index, docs, query))
                    except Exception as e:
                        query_index, query = future_to_query[future]
                        logger.error(f"Error in parallel retrieval for query {query_index + 1}: {str(e)}")
                        results.append((query_index, [], query))
            
            # Sort results by query index to maintain order
            results.sort(key=lambda x: x[0])
            
            # Combine all documents
            all_docs = []
            for query_index, docs, query in results:
                all_docs.extend(docs)
                logger.info(f"Query {query_index + 1} ({query[:50]}...): {len(docs)} documents")
            
            # Remove duplicates while preserving order
            seen_docs = set()
            unique_docs = []
            for doc in all_docs:
                doc_key = (doc.page_content, doc.metadata.get('type', ''), doc.metadata.get('table_name', ''))
                if doc_key not in seen_docs:
                    seen_docs.add(doc_key)
                    unique_docs.append(doc)
            
            logger.info(f"Parallel retrieval completed: {len(all_docs)} total documents, {len(unique_docs)} unique documents")
            return unique_docs
            
        except Exception as e:
            logger.error(f"Error in parallel document retrieval: {str(e)}")
            # Fallback to sequential processing
            logger.warning("Falling back to sequential processing due to parallel execution error")
            all_docs = []
            for i, query in enumerate(follow_up_queries):
                try:
                    docs = retriever.get_relevant_documents(query)
                    all_docs.extend(docs)
                    logger.info(f"Sequential fallback - Query {i+1}: {len(docs)} documents")
                except Exception as seq_error:
                    logger.error(f"Error in sequential fallback for query {i+1}: {str(seq_error)}")
            return all_docs
    
    def generate_collection_name(self) -> str:
        """
        Generate a unique collection name for a PBIX file.
        
        Returns:
            Unique collection name
        """
        unique_id = uuid.uuid4().hex
        return f"{config.VECTOR_STORE_COLLECTION_PREFIX}{unique_id}"
    
    def query_collection(self, collection_name: str, query: str) -> str:
        """
        Query a specific collection with a user question.
        
        Args:
            collection_name: The collection to query
            query: User's question
            
        Returns:
            AI-generated response
        """
        try:
            logger.info(f"Querying collection {collection_name} with query: {query[:100]}...")
            
            # Create RAG chain for this collection
            logger.info(f"Creating RAG chain for collection: {collection_name}")
            rag_chain = self.create_rag_chain(collection_name)
            
            # Execute the query
            logger.info(f"Executing query against RAG chain...")
            response = rag_chain.invoke(query)

            logger.info(f"Successfully generated response for collection {collection_name}")
            logger.info(f"Response length: {len(response) if response else 0} characters")
            return response
            
        except Exception as e:
            logger.error(f"Error querying collection {collection_name}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def query_collection_iterative(self, collection_name: str, query: str, max_iterations: Optional[int] = None, 
                                   max_clarification_rounds: int = 3, user_clarifications: Optional[List[str]] = None,
                                   pre_fetched_context: Optional[str] = None, pre_fetched_docs: Optional[List[Document]] = None) -> Dict[str, Any]:
        """
        Query a collection with iterative context refinement using two-way conversation with Gemini.
        
        This method supports two modes:
        1. Initial analysis mode: Returns clarification questions and pre-fetches context in background
        2. Completion mode: Combines user clarifications with pre-fetched context for final response
        
        Args:
            collection_name: The collection to query
            query: User's question
            max_iterations: Maximum number of iterations (default: from config)
            max_clarification_rounds: Maximum clarification rounds allowed
            user_clarifications: User's answers to clarification questions (if provided, runs in completion mode)
            pre_fetched_context: Pre-fetched context from previous analysis (used in completion mode)
            pre_fetched_docs: Pre-fetched documents from previous analysis (used in completion mode)
            
        Returns:
            Dictionary containing:
            - response: Final AI-generated response (if completion mode) or None (if analysis mode)
            - needs_clarification: True if clarification questions were generated
            - user_clarifications: List of clarification questions for the user
            - pre_fetched_context: Background-fetched context (if analysis mode)
            - iterations: Number of iterations performed
            - context_used: Information about context used
            - follow_up_queries: List of follow-up queries generated
        """
        try:
            # Use config value if max_iterations not provided
            if max_iterations is None:
                max_iterations = config.MAX_RAG_ITERATIONS
                
            logger.info(f"Starting iterative query for collection {collection_name} with query: {query[:100]}...")
            logger.info(f"Max iterations: {max_iterations}")
            logger.info(f"Max clarification rounds: {max_clarification_rounds}")
            
            # Track clarification rounds
            clarification_rounds = 0
            
            # Validate inputs
            if not collection_name:
                raise ValueError("collection_name is required")
            if not query or not query.strip():
                raise ValueError("query cannot be empty")
            
            # Connect to vector store for retrieval
            try:
                vector_store = PGVector(
                    embeddings=self.embedding_model,
                    collection_name=collection_name,
                    connection=config.NEON_CONNECTION_STRING
                )
                logger.info(f"Successfully connected to vector store: {collection_name}")
            except Exception as vs_error:
                logger.error(f"Failed to connect to vector store {collection_name}: {str(vs_error)}")
                logger.error(traceback.format_exc())
                raise ValueError(f"Vector store connection failed: {str(vs_error)}")
            
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={
                    "k": config.MAX_RETRIEVAL_DOCS , 
                    "score_threshold": 0.5  # Lower threshold for better recall
                }
            )
            
            # Initial context retrieval - skip if we already have pre-fetched context
            initial_docs = []
            initial_context = ""
            
            # If we have pre-fetched context that's actually useful (not empty), use it directly
            if pre_fetched_context and len(pre_fetched_context.strip()) > 0:
                # We're in completion mode with pre-fetched context - use it directly
                logger.info(f"Using pre-fetched context directly ({len(pre_fetched_context)} chars), skipping initial retrieval")
                initial_context = pre_fetched_context
            else:
                # Perform initial retrieval
                logger.info("Performing initial context retrieval...")
                try:
                    initial_docs = retriever.get_relevant_documents(query)
                    logger.info(f"Initial retrieval returned {len(initial_docs)} documents")
                except Exception as retrieval_error:
                    logger.error(f"Initial retrieval failed: {str(retrieval_error)}")
                    logger.error(traceback.format_exc())
                    initial_docs = []
                
                initial_context = self._format_docs(initial_docs)
                
                # If initial retrieval returned 0 documents, try with a broader query
                if len(initial_docs) == 0:
                    logger.warning("Initial retrieval returned 0 documents, attempting broader search...")
                    try:
                        # Try with a more general query
                        broader_queries = [
                            "tables columns measures",
                            "data model structure",
                            "table relationships columns"
                        ]
                        for broader_query in broader_queries:
                            docs = retriever.get_relevant_documents(broader_query)
                            if len(docs) > 0:
                                logger.info(f"Broader search with '{broader_query}' returned {len(docs)} documents")
                                initial_docs = docs
                                initial_context = self._format_docs(initial_docs)
                                break
                    except Exception as broader_error:
                        logger.error(f"Broader search failed: {str(broader_error)}")
                        logger.error(traceback.format_exc())
            
            # Check if we have any context to work with
            if not initial_context or len(initial_context.strip()) == 0:
                logger.warning("No initial context available - collection might be empty or query has no matches")
                # Return early with clarification questions to help user
                return {
                    "response": None,
                    "needs_clarification": True,
                    "user_clarifications": [
                        "It seems I couldn't find relevant information in your Power BI file. Could you provide more details about which tables and columns you're working with?",
                        "What specific calculations or visualizations are you trying to create?"
                    ],
                    "pre_fetched_context": None,
                    "follow_up_queries": [],
                    "initial_context": "",
                    "collection_name": collection_name,
                    "original_query": query,
                    "iterations": 0,
                    "max_iterations": max_iterations,
                    "context_used": {
                        "initial_docs_count": 0,
                        "total_context_length": 0,
                        "follow_up_queries_count": 0,
                        "clarification_rounds": 0,
                        "warning": "No context found in vector store"
                    }
                }
            
            # First iteration: Ask Gemini if it needs more information
            logger.info(f"First iteration: Analyzing context sufficiency with {len(initial_context)} chars of context...")
            context_analysis_prompt = self._create_context_analysis_prompt(query, initial_context)
            
            # Create a simple chain for context analysis
            analysis_chain = (
                {"context": lambda x: initial_context, "question": lambda x: query}
                | PromptTemplate(template=context_analysis_prompt, input_variables=["context", "question"])
                | self.llm
                | StrOutputParser()
            )
            
            analysis_response = analysis_chain.invoke({"context": initial_context, "question": query})
            
            # Parse the analysis response to determine if more context is needed
            needs_more_context, follow_up_queries, analysis_user_clarifications = self._parse_context_analysis(analysis_response)
            
            # Check if we should ask for clarifications (limit to max_clarification_rounds)
            if analysis_user_clarifications and clarification_rounds >= max_clarification_rounds:
                logger.info(f"Max clarification rounds ({max_clarification_rounds}) reached, proceeding without clarifications")
                analysis_user_clarifications = []
            
            # DECOUPLED WORKFLOW: If we have clarification questions and no user answers yet, return early
            if analysis_user_clarifications and not user_clarifications:
                logger.info("Clarification questions generated, returning early for user input")
                
                # Pre-fetch context in the background while user is answering
                pre_fetched_context = None
                if follow_up_queries:
                    logger.info("Pre-fetching context in background while user answers clarifications...")
                    try:
                        pre_fetched_docs = self._retrieve_documents_parallel(retriever, follow_up_queries)
                        pre_fetched_context = self._format_docs(pre_fetched_docs)
                        logger.info(f"Pre-fetched {len(pre_fetched_docs)} documents in background")
                        logger.info(f"DEBUG - Pre-fetched context type: {type(pre_fetched_context)}, length: {len(pre_fetched_context) if pre_fetched_context else 0}")
                    except Exception as e:
                        logger.warning(f"Background pre-fetching failed: {str(e)}")
                        logger.warning(traceback.format_exc())
                        pre_fetched_context = None
                
                logger.info(f"DEBUG - Returning from RAG with pre_fetched_context: {type(pre_fetched_context)}, length: {len(pre_fetched_context) if pre_fetched_context else 0}")
                
                return {
                    "response": None,  # No response yet, waiting for clarifications
                    "needs_clarification": True,
                    "user_clarifications": analysis_user_clarifications,
                    "pre_fetched_context": pre_fetched_context,
                    "follow_up_queries": follow_up_queries,
                    "initial_context": initial_context,
                    "collection_name": collection_name,
                    "original_query": query,
                    "iterations": 1,
                    "max_iterations": max_iterations,
                    "context_used": {
                        "initial_docs_count": len(initial_docs),
                        "total_context_length": len(initial_context),
                        "follow_up_queries_count": len(follow_up_queries),
                        "clarification_rounds": clarification_rounds
                    }
                }
            
            # COMPLETION MODE: User has provided clarifications, proceed with enhanced context
            # Build comprehensive context from all available sources
            all_context = initial_context
            
            # Add pre-fetched context if available and not already included
            if pre_fetched_context and pre_fetched_context not in initial_context:
                logger.info(f"Adding pre-fetched context to all_context (length: {len(pre_fetched_context)})")
                if all_context:
                    all_context += "\n\n--- Additional Pre-fetched Context ---\n\n" + pre_fetched_context
                else:
                    all_context = pre_fetched_context
            
            follow_up_queries_used = []
            iterations = 1
            
            # If user provided clarifications, incorporate them into the context
            if user_clarifications:
                logger.info(f"Incorporating {len(user_clarifications)} user clarifications")
                clarification_context = f"\n\n--- User Clarifications ---\n"
                for i, clarification in enumerate(user_clarifications, 1):
                    clarification_context += f"{i}. {clarification}\n"
                all_context += clarification_context
                
            logger.info(f"Total context length for completion: {len(all_context)} characters")
            
            # Perform follow-up iterations if needed
            while needs_more_context and iterations < max_iterations:
                logger.info(f"Iteration {iterations + 1}/{max_iterations}: Retrieving additional context...")
                
                # Generate additional context using follow-up queries in parallel
                max_queries = config.MAX_FOLLOW_UP_QUERIES_PER_ITERATION
                queries_to_process = follow_up_queries[:max_queries]
                logger.info(f"Processing {len(queries_to_process)} follow-up queries in parallel...")
                
                # Use parallel retrieval for better performance
                unique_additional_docs = self._retrieve_documents_parallel(retriever, queries_to_process)
                
                # Track which queries were used
                follow_up_queries_used.extend(queries_to_process)
                
                logger.info(f"After deduplication: {len(unique_additional_docs)} unique additional documents")
                
                if unique_additional_docs:
                    additional_context = self._format_docs(unique_additional_docs)
                    all_context += f"\n\n--- Additional Context (Iteration {iterations + 1}) ---\n\n" + additional_context
                    
                    # Check if we need even more context (only if not on last iteration)
                    if iterations + 1 < max_iterations:
                        logger.info("Analyzing if additional context is needed...")
                        analysis_response = analysis_chain.invoke({"context": all_context, "question": query})
                        needs_more_context, new_follow_up_queries, user_clarifications = self._parse_context_analysis(analysis_response)
                        
                        # Check if we should ask for clarifications (limit to max_clarification_rounds)
                        if user_clarifications and clarification_rounds >= max_clarification_rounds:
                            logger.info(f"Max clarification rounds ({max_clarification_rounds}) reached, proceeding without clarifications")
                            user_clarifications = []
                        
                        if new_follow_up_queries:
                            follow_up_queries = new_follow_up_queries
                            logger.info(f"Generated {len(new_follow_up_queries)} new follow-up queries for next iteration")
                        else:
                            needs_more_context = False
                            logger.info("No more follow-up queries needed")
                    else:
                        logger.info("Reached maximum iterations, proceeding to final response")
                        needs_more_context = False
                else:
                    logger.warning("No additional documents found, stopping iterations")
                    needs_more_context = False
                
                iterations += 1
            
            # Generate final response with all accumulated context
            logger.info("Generating final response with enhanced context...")
            final_prompt = self._create_final_response_prompt(query, all_context)
            
            final_chain = (
                {"context": lambda x: all_context, "question": lambda x: query}
                | PromptTemplate(template=final_prompt, input_variables=["context", "question"])
                | self.llm
                | StrOutputParser()
            )
            
            final_response = final_chain.invoke({"context": all_context, "question": query})
            
            logger.info(f"Iterative query completed with {iterations} iterations")
            
            # Increment clarification rounds if clarifications are being asked
            if user_clarifications and len(user_clarifications) > 0:
                clarification_rounds += 1
                logger.info(f"Clarification round {clarification_rounds}/{max_clarification_rounds}")
            
            # Create detailed iteration summary
            iteration_summary = self._create_iteration_summary(
                iterations, 
                len(initial_docs), 
                len(all_context), 
                follow_up_queries_used,
                max_iterations
            )
            
            return {
                "response": final_response,
                "needs_clarification": False,  # Completed successfully
                "user_clarifications": user_clarifications if user_clarifications else [],
                "iterations": iterations,
                "max_iterations": max_iterations,
                "context_used": {
                    "initial_docs_count": len(initial_docs),
                    "total_context_length": len(all_context),
                    "follow_up_queries_count": len(follow_up_queries_used),
                    "clarification_rounds": clarification_rounds
                },
                "follow_up_queries": follow_up_queries_used,
                "iteration_summary": iteration_summary
            }
            
        except Exception as e:
            logger.error(f"Error in iterative query for collection {collection_name}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def complete_query_with_clarifications(self, collection_name: str, original_query: str, 
                                         user_clarifications: List[str], pre_fetched_context: Optional[str] = None,
                                         max_iterations: Optional[int] = None) -> Dict[str, Any]:
        """
        Complete a query using user clarifications and optionally pre-fetched context.
        
        This method is called after the user has answered clarification questions
        to generate the final response with enhanced context.
        
        Args:
            collection_name: The collection to query
            original_query: The original user question
            user_clarifications: User's answers to clarification questions
            pre_fetched_context: Pre-fetched context from background processing
            max_iterations: Maximum number of iterations (default: from config)
            
        Returns:
            Dictionary containing the final response and metadata
        """
        try:
            logger.info(f"Completing query with clarifications for collection {collection_name}")
            logger.info(f"User clarifications: {user_clarifications}")
            
            # Use the iterative method in completion mode
            return self.query_collection_iterative(
                collection_name=collection_name,
                query=original_query,
                max_iterations=max_iterations,
                user_clarifications=user_clarifications
            )
            
        except Exception as e:
            logger.error(f"Error completing query with clarifications: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _create_context_analysis_prompt(self, query: str, context: str) -> str:
        """Create a prompt for analyzing if the context is sufficient."""
        return """
You are analyzing whether the provided context contains enough information to answer the user's Power BI question accurately and comprehensively.

User Question: {question}

Available Context:
{context}

Please analyze the context thoroughly and respond with a JSON object in the following format:
{{
    "sufficient": true/false,
    "reasoning": "Detailed explanation of why the context is or isn't sufficient",
    "missing_information": ["List of specific information that would be helpful"],
    "follow_up_queries": ["List of 2-3 thinking descriptions showing what the AI is searching for or analyzing in the Power BI semantic model"],
    "user_clarifications": ["List of questions that require user input and cannot be answered by the Power BI semantic model"],
    "confidence_level": "high/medium/low"
}}

Analysis Guidelines:
1. Be very thorough in your analysis - if ANY key information is missing, set "sufficient" to false
2. Consider if you have enough information to provide step-by-step instructions
3. Check if you have specific table names, column names, measure names, and relationships
4. Ensure you can provide exact DAX code examples using their actual data model
5. If the context is missing critical Power BI elements, generate targeted follow-up queries
6. Focus on Power BI specific elements: tables, columns, measures, relationships, data types, filters
7. Consider if you need more information about existing measures, calculated columns, or data model structure
8. Set confidence_level to "high" only if you have complete information, "medium" if mostly complete, "low" if significant gaps

Follow-up Query Guidelines (for Power BI semantic model):
- Generate natural thinking descriptions that show the AI's reasoning process
- Use phrases like "Searching for...", "Analyzing...", "Investigating...", "Exploring..."
- Focus on what the AI is trying to understand or find
- Examples: "Searching for relationships between Fact Transactions and product tables", "Analyzing existing measures related to cost calculations", "Investigating the data model structure for product information"
- Avoid question format - use descriptive statements about the AI's thought process

User Clarification Guidelines (for questions that need user input):
- These are questions that can ONLY be answered by the user, not by the Power BI semantic model
- Examples: business logic preferences, specific requirements, data interpretation needs, report design choices
- Examples: "What time period should this calculation cover?", "What specific business rules apply?", "How should this be formatted?"
- Examples: "What is the acceptable threshold for this metric?", "Which stakeholders should see this report?"
- Do NOT include questions about Power BI technical implementation - those go in follow_up_queries
- Do NOT include questions about data structure that could be found in the semantic model
"""
    
    def _create_final_response_prompt(self, query: str, context: str) -> str:
        """Create the final response prompt with enhanced context."""
        return """
You are a Power BI expert assistant. You help users with Power BI questions based on their specific data model.

Context from their Power BI file:
{context}

User Question: {question}

CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
1. DO NOT MAKE ASSUMPTIONS - Only use information that is explicitly provided in the context
2. If information is NOT found in the context, clearly state "This information is not available in your Power BI file"
3. When something doesn't exist, guide the user to create it from scratch with step-by-step instructions
4. Be completely unambiguous - if you're not certain, say so explicitly

Response Guidelines:
1. Be specific and reference their actual tables, columns, and measures ONLY if they exist in the context
2. Use the exact table names, column names, and measure names from their data model (only if present)
3. If they ask about creating measures and no similar measures exist, provide a complete guide to create from scratch
4. If they ask about relationships and none exist, guide them to create the necessary relationships
5. If they ask about DAX and no examples exist in their model, provide generic examples and explain how to adapt them
6. Provide step-by-step instructions for everything
7. Include complete DAX code examples with detailed explanations
8. Mention potential pitfalls or common mistakes
9. Suggest best practices specific to their data model (if applicable) or general best practices
10. If the context doesn't contain relevant information, clearly state this and provide comprehensive guidance for creating it

Formatting (brief):
- Only full DAX formulas go in fenced blocks: 
```dax
-- formula here
```
- Keep identifiers inline in backticks (e.g., `Fact Transactions[Units]`).
- Avoid manual line breaks inside sentences and bullets.

IMPORTANT: 
- If a table, column, measure, or relationship is not found in the context, it means it doesn't exist in their Power BI file
- Never assume the existence of anything not explicitly mentioned in the context
- Always provide complete, actionable guidance for creating missing elements
- Be thorough and leave no ambiguity about what exists vs. what needs to be created

Please provide a helpful, detailed, and completely unambiguous response focused on Power BI.
"""
    
    def _parse_context_analysis(self, analysis_response: str) -> tuple[bool, List[str], List[str]]:
        """Parse the context analysis response to extract follow-up queries and user clarifications."""
        try:
            import json
            import re
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', analysis_response, re.DOTALL)
            if json_match:
                analysis_data = json.loads(json_match.group())
                sufficient = analysis_data.get("sufficient", True)
                follow_up_queries = analysis_data.get("follow_up_queries", [])
                user_clarifications = analysis_data.get("user_clarifications", [])
                confidence_level = analysis_data.get("confidence_level", "medium")
                
                # Log the analysis details
                logger.info(f"Context analysis - Sufficient: {sufficient}, Confidence: {confidence_level}")
                logger.info(f"Follow-up queries: {follow_up_queries}")
                logger.info(f"User clarifications: {user_clarifications}")
                
                # Only continue if not sufficient AND we have follow-up queries
                needs_more = not sufficient and len(follow_up_queries) > 0
                return needs_more, follow_up_queries, user_clarifications
            else:
                # Fallback: look for keywords indicating more context is needed
                response_lower = analysis_response.lower()
                needs_more = any(keyword in response_lower for keyword in [
                    "insufficient", "missing", "need more", "not enough", "incomplete", "false"
                ])
                logger.warning("Could not parse JSON from context analysis, using fallback logic")
                return needs_more, [], []
                
        except Exception as e:
            logger.warning(f"Error parsing context analysis: {str(e)}")
            return False, [], []
    
    def _create_iteration_summary(self, iterations: int, initial_docs: int, total_context_length: int, 
                                follow_up_queries: List[str], max_iterations: int) -> Dict[str, Any]:
        """Create a detailed summary of the iteration process."""
        return {
            "total_iterations_performed": iterations,
            "max_iterations_allowed": max_iterations,
            "iterations_used_percentage": round((iterations / max_iterations) * 100, 1),
            "context_enhancement": {
                "initial_documents": initial_docs,
                "total_context_length": total_context_length,
                "context_growth_factor": round(total_context_length / (initial_docs * 100) if initial_docs > 0 else 1, 2)
            },
            "follow_up_queries_used": len(follow_up_queries),
            "queries_per_iteration": round(len(follow_up_queries) / max(iterations - 1, 1), 2) if iterations > 1 else 0,
            "efficiency_metrics": {
                "documents_per_query": round(initial_docs / max(len(follow_up_queries), 1), 2) if follow_up_queries else 0,
                "context_utilization": "high" if iterations < max_iterations else "maximum_reached"
            },
            "process_status": "completed" if iterations < max_iterations else "max_iterations_reached"
        }
    
    def delete_collection(self, collection_name: str) -> bool:
        """
        Delete a collection from the vector database.
        
        Args:
            collection_name: The collection to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Deleting collection: {collection_name}")
            
            # Connect to vector store
            vector_store = PGVector(
                embeddings=self.embedding_model,
                collection_name=collection_name,
                connection=config.NEON_CONNECTION_STRING
            )
            
            # Delete the collection using the new API
            vector_store.delete_collection()
            
            logger.info(f"Successfully deleted collection: {collection_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting collection {collection_name}: {str(e)}")
            return False
    
    def list_collections(self) -> List[str]:
        """
        List all available collections in the vector database.
        
        Returns:
            List of collection names
        """
        try:
            # Create a temporary vector store to list collections
            vector_store = PGVector(
                embeddings=self.embedding_model,
                collection_name="temp",  # Temporary collection name
                connection=config.NEON_CONNECTION_STRING
            )
            
            # Use the new API to list collections
            collections = vector_store.list_collections()
            logger.info(f"Found {len(collections)} collections")
            return collections
            
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
            return []
