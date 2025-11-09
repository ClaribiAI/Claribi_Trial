# app/powerbi_chat/services/vector_store_service.py

import logging
import uuid
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_postgres import PGVector
from app.config.settings import config
from app.core.database import get_db_cursor, get_db_connection_string
from app.powerbi_chat.services.llm_service import llm_service

logger = logging.getLogger(__name__)

class VectorStoreService:
    """Service for managing vector store collections in pgvector."""

    def __init__(self):
        # Use pooled connection string for LangChain PGVector
        # LangChain can use pooled connections (transaction mode is fine for vector operations)
        try:
            self.connection_string = get_db_connection_string()
        except Exception as e:
            # Fallback to config if pool not initialized yet
            if not config.NEON_CONNECTION_STRING:
                raise ValueError("Database connection string not configured") from e
            self.connection_string = config.NEON_CONNECTION_STRING
        self.embedding_model = llm_service.embedding_model

    # ... (existing methods: generate_collection_name, create_collection, etc.) ...
    def generate_collection_name(self) -> str:
        """Generates a unique collection name prefixed from config."""
        unique_id = uuid.uuid4().hex
        return f"{config.VECTOR_STORE_COLLECTION_PREFIX}{unique_id}"

    def create_collection(self, docs: List[Document], collection_name: str, metadata: Dict[str, Any] = None, ms_object_id: str = None) -> None:
        """Creates a new vector store collection from documents with optional metadata."""
        if not docs:
            raise ValueError("No documents provided for vector store creation.")
        
        # Create the vector store with metadata if provided
        if metadata:
            PGVector.from_documents(
                documents=docs,
                embedding=self.embedding_model,
                collection_name=collection_name,
                connection=self.connection_string,
                collection_metadata=metadata
            )
        else:
            PGVector.from_documents(
                documents=docs,
                embedding=self.embedding_model,
                collection_name=collection_name,
                connection=self.connection_string,
            )
        logger.info(f"Created vector store for collection: {collection_name} with {len(docs)} documents")
        
        # Update langchain_pg_collection and langchain_pg_embedding tables with ms_object_id and collection_name
        if ms_object_id:
            try:
                with get_db_cursor(commit=True) as cursor:
                    # First, get the collection UUID
                    cursor.execute("""
                        SELECT uuid FROM langchain_pg_collection WHERE name = %s
                    """, (collection_name,))
                    result = cursor.fetchone()
                    
                    if result:
                        collection_uuid = result[0]
                        
                        # Update the collection with ms_object_id
                        cursor.execute("""
                            UPDATE langchain_pg_collection 
                            SET ms_object_id = %s 
                            WHERE name = %s
                        """, (ms_object_id, collection_name))
                        logger.info(f"Updated langchain_pg_collection with ms_object_id for collection: {collection_name}")
                        
                        # Update all embeddings in this collection with collection_name and ms_object_id
                        cursor.execute("""
                            UPDATE langchain_pg_embedding 
                            SET collection_name = %s, ms_object_id = %s 
                            WHERE collection_id = %s
                        """, (collection_name, ms_object_id, collection_uuid))
                        updated_count = cursor.rowcount
                        logger.info(f"Updated {updated_count} embeddings with collection_name and ms_object_id for collection: {collection_name}")
                    else:
                        logger.warning(f"Collection {collection_name} not found when trying to update ms_object_id")
            except Exception as e:
                logger.error(f"Error updating langchain tables with ms_object_id: {e}", exc_info=True)

    def get_retriever(self, collection_name: str):
        """Gets a retriever for an existing collection."""
        vector_store = PGVector(
            collection_name=collection_name,
            connection=self.connection_string,
            embeddings=self.embedding_model,
        )
        return vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": config.MAX_RETRIEVAL_DOCS, "score_threshold": 0.5}
        )

    def log_retrieval_operation(self, query: str, results_count: int, operation: str = "retrieval"):
        """Log retrieval operation details for monitoring."""
        logger.info(f"🔍 {operation}: {results_count} results")

    def delete_collection(self, collection_name: str) -> bool:
        """Deletes a collection and all associated database records."""
        try:
            # Delete embeddings and collection metadata from LangChain tables
            with get_db_cursor(commit=True) as cursor:
                # First, get the collection UUID to delete embeddings
                cursor.execute(
                    "SELECT uuid FROM langchain_pg_collection WHERE name = %s",
                    (collection_name,)
                )
                result = cursor.fetchone()
                
                if result:
                    collection_uuid = result[0]
                    # Delete all embeddings for this collection
                    cursor.execute(
                        "DELETE FROM langchain_pg_embedding WHERE collection_id = %s",
                        (collection_uuid,)
                    )
                    logger.info(f"Deleted embeddings for collection: {collection_name}")
                    
                    # Delete the collection metadata
                    cursor.execute(
                        "DELETE FROM langchain_pg_collection WHERE name = %s",
                        (collection_name,)
                    )
                    logger.info(f"Deleted collection metadata for: {collection_name}")
                
                # Delete from powerbi_file_summaries
                cursor.execute(
                    "DELETE FROM powerbi_file_summaries WHERE collection_name = %s",
                    (collection_name,)
                )
                
                # Delete from powerbi_generated_docs
                cursor.execute(
                    "DELETE FROM powerbi_generated_docs WHERE collection_name = %s",
                    (collection_name,)
                )
                
                logger.info(f"Deleted all database records for collection: {collection_name}")
            
            return True
        except Exception as e:
            logger.error(f"Error deleting collection {collection_name}: {e}", exc_info=True)
            return False

    def list_collections_with_details(self) -> List[Dict[str, Any]]:
        """
        Queries the database for all PBIX collections and their metadata details.
        """
        uploaded_files = []
        query = """
        SELECT c.name, c.cmetadata, COUNT(e.id) as document_count
        FROM langchain_pg_collection c
        LEFT JOIN langchain_pg_embedding e ON c.uuid = e.collection_id
        WHERE c.cmetadata IS NOT NULL AND c.cmetadata->>'filename' IS NOT NULL
        GROUP BY c.uuid, c.name, c.cmetadata
        ORDER BY (c.cmetadata->>'upload_time') DESC;
        """
        
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute(query)
                collections = cursor.fetchall()

                for collection in collections:
                    # collections is a list of tuples: (name, cmetadata, document_count)
                    name, cmetadata, document_count = collection
                    metadata = cmetadata or {}
                    
                    # Use summary metadata if available, otherwise create basic summary
                    if 'summary' in metadata:
                        summary = metadata['summary']
                    else:
                        # Fallback for old data format
                        summary = {
                            'tables_count': 0,
                            'measures_count': 0,
                            'columns_count': 0,
                            'relationships_count': 0,
                            'power_query_scripts_count': 0,
                            'document_count': int(document_count)
                        }
                    
                    uploaded_files.append({
                        'collection_name': name,
                        'filename': metadata.get('filename'),
                        'upload_time': metadata.get('upload_time'),
                        'file_size': metadata.get('file_size', 0),
                        'metadata': summary,
                        'document_count': int(document_count)
                    })
        except Exception as db_error:
            logger.error(f"Database error listing collections: {db_error}", exc_info=True)
            raise  # Re-raise the exception to be handled by the API layer

        return uploaded_files

# Singleton instance
vector_store_service = VectorStoreService()