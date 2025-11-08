# app/powerbi_docs/services/token_tracking_service.py

import logging
from typing import Dict, Any, Optional, List
from app.core.database import get_db_cursor

logger = logging.getLogger(__name__)

class PowerBIDocsTokenTrackingService:
    """
    Service for tracking token usage in Power BI documentation functionality.
    Provides cumulative tracking per user, collection, and section with graceful upsert operations.
    """
    
    @staticmethod
    def record_token_usage(user_ms_object_id: str, collection_name: str, section: str, 
                          input_tokens: int, output_tokens: int) -> bool:
        """
        Record token usage for a user, collection, and section with cumulative aggregation.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            collection_name: Name of the Power BI file collection
            section: Documentation section name (executive_summary, data_model_analysis, etc.)
            input_tokens: Number of input tokens used
            output_tokens: Number of output tokens used
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                # Use PostgreSQL UPSERT with ON CONFLICT for atomic operation
                cursor.execute("""
                    INSERT INTO powerbi_docs_token_usage 
                    (user_ms_object_id, collection_name, section, generation_count, 
                     input_tokens, output_tokens, created_at, updated_at)
                    VALUES (%s, %s, %s, 1, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_ms_object_id, collection_name, section) 
                    DO UPDATE SET
                        generation_count = powerbi_docs_token_usage.generation_count + 1,
                        input_tokens = powerbi_docs_token_usage.input_tokens + %s,
                        output_tokens = powerbi_docs_token_usage.output_tokens + %s,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    user_ms_object_id, collection_name, section,
                    input_tokens, output_tokens,
                    # Values for UPDATE clause
                    input_tokens, output_tokens
                ))
                
                logger.info(f"Successfully recorded token usage for user {user_ms_object_id}, collection {collection_name}, section {section}")
                return True
                    
        except Exception as e:
            logger.error(f"Error recording token usage for user {user_ms_object_id}, collection {collection_name}, section {section}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def get_user_token_usage(user_ms_object_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve token usage statistics for a user across all collections and sections.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            List of dictionaries containing usage statistics
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, collection_name, section, generation_count,
                           input_tokens, output_tokens, created_at, updated_at
                    FROM powerbi_docs_token_usage 
                    WHERE user_ms_object_id = %s
                    ORDER BY collection_name, section
                """, (user_ms_object_id,))
                
                results = cursor.fetchall()
                return [
                    {
                        'user_ms_object_id': row[0],
                        'collection_name': row[1],
                        'section': row[2],
                        'generation_count': row[3],
                        'input_tokens': row[4],
                        'output_tokens': row[5],
                        'created_at': row[6].isoformat() if row[6] else None,
                        'updated_at': row[7].isoformat() if row[7] else None
                    }
                    for row in results
                ]
                    
        except Exception as e:
            logger.error(f"Error retrieving token usage for user {user_ms_object_id}: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_collection_token_usage(collection_name: str) -> List[Dict[str, Any]]:
        """
        Retrieve token usage statistics for a collection across all users and sections.
        
        Args:
            collection_name: Name of the Power BI file collection
            
        Returns:
            List of dictionaries containing usage statistics
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, collection_name, section, generation_count,
                           input_tokens, output_tokens, created_at, updated_at
                    FROM powerbi_docs_token_usage 
                    WHERE collection_name = %s
                    ORDER BY user_ms_object_id, section
                """, (collection_name,))
                
                results = cursor.fetchall()
                return [
                    {
                        'user_ms_object_id': row[0],
                        'collection_name': row[1],
                        'section': row[2],
                        'generation_count': row[3],
                        'input_tokens': row[4],
                        'output_tokens': row[5],
                        'created_at': row[6].isoformat() if row[6] else None,
                        'updated_at': row[7].isoformat() if row[7] else None
                    }
                    for row in results
                ]
                    
        except Exception as e:
            logger.error(f"Error retrieving token usage for collection {collection_name}: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_section_token_usage(section: str) -> List[Dict[str, Any]]:
        """
        Retrieve token usage statistics for a specific section across all users and collections.
        
        Args:
            section: Documentation section name
            
        Returns:
            List of dictionaries containing usage statistics
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, collection_name, section, generation_count,
                           input_tokens, output_tokens, created_at, updated_at
                    FROM powerbi_docs_token_usage 
                    WHERE section = %s
                    ORDER BY user_ms_object_id, collection_name
                """, (section,))
                
                results = cursor.fetchall()
                return [
                    {
                        'user_ms_object_id': row[0],
                        'collection_name': row[1],
                        'section': row[2],
                        'generation_count': row[3],
                        'input_tokens': row[4],
                        'output_tokens': row[5],
                        'created_at': row[6].isoformat() if row[6] else None,
                        'updated_at': row[7].isoformat() if row[7] else None
                    }
                    for row in results
                ]
                    
        except Exception as e:
            logger.error(f"Error retrieving token usage for section {section}: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_all_token_usage() -> List[Dict[str, Any]]:
        """
        Retrieve token usage statistics for all users, collections, and sections.
        
        Returns:
            List of dictionaries containing usage statistics
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, collection_name, section, generation_count,
                           input_tokens, output_tokens, created_at, updated_at
                    FROM powerbi_docs_token_usage 
                    ORDER BY user_ms_object_id, collection_name, section
                """)
                
                results = cursor.fetchall()
                return [
                    {
                        'user_ms_object_id': row[0],
                        'collection_name': row[1],
                        'section': row[2],
                        'generation_count': row[3],
                        'input_tokens': row[4],
                        'output_tokens': row[5],
                        'created_at': row[6].isoformat() if row[6] else None,
                        'updated_at': row[7].isoformat() if row[7] else None
                    }
                    for row in results
                ]
                    
        except Exception as e:
            logger.error(f"Error retrieving all token usage: {e}", exc_info=True)
            return []

# Singleton instance
powerbi_docs_token_tracking_service = PowerBIDocsTokenTrackingService()
