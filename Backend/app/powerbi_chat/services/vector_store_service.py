# app/powerbi_chat/services/vector_store_service.py

import logging
import uuid
import psycopg
# Note: psycopg v3 doesn't have RealDictCursor in extras, using regular Cursor
# from psycopg.extras import RealDictCursor
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_postgres import PGVector
from app.config.settings import config
from app.powerbi_chat.services.llm_service import llm_service

logger = logging.getLogger(__name__)

class VectorStoreService:
    """Service for managing vector store collections in pgvector."""

    def __init__(self):
        if not config.NEON_CONNECTION_STRING:
            raise ValueError("NEON_CONNECTION_STRING not configured")
        self.connection_string = config.NEON_CONNECTION_STRING
        self.embedding_model = llm_service.embedding_model

    # ... (existing methods: generate_collection_name, create_collection, etc.) ...
    def generate_collection_name(self) -> str:
        """Generates a unique collection name prefixed from config."""
        unique_id = uuid.uuid4().hex
        return f"{config.VECTOR_STORE_COLLECTION_PREFIX}{unique_id}"

    def create_collection(self, docs: List[Document], collection_name: str, metadata: Dict[str, Any] = None) -> None:
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
        """Deletes a collection."""
        try:
            store = PGVector(
                collection_name=collection_name,
                connection=self.connection_string,
                embeddings=self.embedding_model,
            )
            store.delete_collection()
            logger.info(f"Deleted collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection {collection_name}: {e}")
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
            with psycopg.connect(self.connection_string) as conn:
                with conn.cursor() as cursor:
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