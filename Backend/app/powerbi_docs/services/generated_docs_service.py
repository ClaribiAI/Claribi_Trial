import logging
from typing import Dict, Any, Optional, List
import psycopg
from psycopg.types.json import Jsonb
from app.config.settings import config

logger = logging.getLogger(__name__)

class GeneratedDocsService:
    """
    Service for managing generated PowerBI documentation sections in the database.
    Handles saving, retrieving, and updating generated documentation content.
    """
    
    @staticmethod
    def save_generated_section(collection_name: str, section_name: str, content: Any) -> bool:
        """
        Save or update a generated documentation section.
        
        Args:
            collection_name: The collection name (file identifier)
            section_name: The section type (executive_summary, data_model_analysis, etc.)
            content: The generated content to store
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Ensure content is properly formatted for JSONB storage
            if isinstance(content, str):
                # If it's a string, wrap it in a JSON object
                formatted_content = {"content": content, "type": "text"}
            elif isinstance(content, dict):
                # If it's already a dict, use it as-is
                formatted_content = content
            else:
                # For other types, convert to string and wrap
                formatted_content = {"content": str(content), "type": "text"}
            
            with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
                with conn.cursor() as cursor:
                    # Use UPSERT (INSERT ... ON CONFLICT UPDATE)
                    cursor.execute("""
                        INSERT INTO powerbi_generated_docs (collection_name, section_name, generated_content)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (collection_name, section_name)
                        DO UPDATE SET 
                            generated_content = EXCLUDED.generated_content,
                            updated_at = CURRENT_TIMESTAMP
                    """, (collection_name, section_name, Jsonb(formatted_content)))
                    
                    conn.commit()
                    logger.info(f"Successfully saved {section_name} for collection {collection_name}")
                    return True
                    
        except Exception as e:
            logger.error(f"Error saving generated section {section_name} for {collection_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def get_all_generated_sections(collection_name: str) -> Dict[str, Any]:
        """
        Retrieve all generated sections for a collection.
        
        Args:
            collection_name: The collection name to retrieve sections for
            
        Returns:
            Dict keyed by section_name with content and metadata
        """
        try:
            with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT section_name, generated_content, created_at, updated_at
                        FROM powerbi_generated_docs 
                        WHERE collection_name = %s
                        ORDER BY section_name
                    """, (collection_name,))
                    
                    results = cursor.fetchall()
                    
                    sections = {}
                    for section_name, content, created_at, updated_at in results:
                        sections[section_name] = {
                            'content': content,
                            'created_at': created_at.isoformat() if created_at else None,
                            'updated_at': updated_at.isoformat() if updated_at else None
                        }
                    
                    logger.info(f"Retrieved {len(sections)} generated sections for collection {collection_name}")
                    return sections
                    
        except Exception as e:
            logger.error(f"Error retrieving generated sections for {collection_name}: {e}", exc_info=True)
            return {}
    
    @staticmethod
    def get_generated_section(collection_name: str, section_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific generated section.
        
        Args:
            collection_name: The collection name
            section_name: The section type to retrieve
            
        Returns:
            Dict with content and metadata, or None if not found
        """
        try:
            with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT generated_content, created_at, updated_at
                        FROM powerbi_generated_docs 
                        WHERE collection_name = %s AND section_name = %s
                    """, (collection_name, section_name))
                    
                    result = cursor.fetchone()
                    
                    if result:
                        content, created_at, updated_at = result
                        return {
                            'content': content,
                            'created_at': created_at.isoformat() if created_at else None,
                            'updated_at': updated_at.isoformat() if updated_at else None
                        }
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error retrieving section {section_name} for {collection_name}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def delete_generated_section(collection_name: str, section_name: str) -> bool:
        """
        Delete a specific generated section.
        
        Args:
            collection_name: The collection name
            section_name: The section type to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        DELETE FROM powerbi_generated_docs 
                        WHERE collection_name = %s AND section_name = %s
                    """, (collection_name, section_name))
                    
                    conn.commit()
                    logger.info(f"Successfully deleted {section_name} for collection {collection_name}")
                    return True
                    
        except Exception as e:
            logger.error(f"Error deleting section {section_name} for {collection_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def delete_all_generated_sections(collection_name: str) -> bool:
        """
        Delete all generated sections for a collection.
        
        Args:
            collection_name: The collection name to delete sections for
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with psycopg.connect(config.NEON_CONNECTION_STRING) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        DELETE FROM powerbi_generated_docs 
                        WHERE collection_name = %s
                    """, (collection_name,))
                    
                    conn.commit()
                    logger.info(f"Successfully deleted all generated sections for collection {collection_name}")
                    return True
                    
        except Exception as e:
            logger.error(f"Error deleting all sections for {collection_name}: {e}", exc_info=True)
            return False

# Create a singleton instance
generated_docs_service = GeneratedDocsService()
