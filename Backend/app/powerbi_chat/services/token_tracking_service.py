# app/powerbi_chat/services/token_tracking_service.py

import logging
from typing import Dict, Any, Optional
from app.core.database import get_db_cursor

logger = logging.getLogger(__name__)

class TokenTrackingService:
    """
    Service for tracking token usage in Power BI chat functionality.
    Provides cumulative tracking per user with graceful upsert operations.
    """
    
    @staticmethod
    def record_token_usage(user_ms_object_id: str, token_usage_dict: Dict[str, Any]) -> bool:
        """
        Record token usage for a user with cumulative aggregation.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            token_usage_dict: Dictionary containing token usage data from RAG orchestration
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Extract token usage data
            context_analysis_input = token_usage_dict.get('context_analysis_input_tokens', 0)
            context_analysis_output = token_usage_dict.get('context_analysis_output_tokens', 0)
            context_analysis_overhead = token_usage_dict.get('context_analysis_overhead_tokens', 0)
            final_response_input = token_usage_dict.get('final_response_input_tokens', 0)
            final_response_output = token_usage_dict.get('final_response_output_tokens', 0)
            final_response_overhead = token_usage_dict.get('final_response_overhead_tokens', 0)
            
            with get_db_cursor(commit=True) as cursor:
                # Use PostgreSQL UPSERT with ON CONFLICT for atomic operation
                cursor.execute("""
                    INSERT INTO powerbi_chat_token_usage 
                    (user_ms_object_id, total_queries, 
                     context_analysis_input_tokens, context_analysis_output_tokens, context_analysis_overhead_tokens,
                     final_response_input_tokens, final_response_output_tokens, final_response_overhead_tokens,
                     created_at, updated_at)
                    VALUES (%s, 1, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_ms_object_id) 
                    DO UPDATE SET
                        total_queries = powerbi_chat_token_usage.total_queries + 1,
                        context_analysis_input_tokens = powerbi_chat_token_usage.context_analysis_input_tokens + %s,
                        context_analysis_output_tokens = powerbi_chat_token_usage.context_analysis_output_tokens + %s,
                        context_analysis_overhead_tokens = powerbi_chat_token_usage.context_analysis_overhead_tokens + %s,
                        final_response_input_tokens = powerbi_chat_token_usage.final_response_input_tokens + %s,
                        final_response_output_tokens = powerbi_chat_token_usage.final_response_output_tokens + %s,
                        final_response_overhead_tokens = powerbi_chat_token_usage.final_response_overhead_tokens + %s,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    user_ms_object_id,
                    context_analysis_input, context_analysis_output, context_analysis_overhead,
                    final_response_input, final_response_output, final_response_overhead,
                    # Values for UPDATE clause
                    context_analysis_input, context_analysis_output, context_analysis_overhead,
                    final_response_input, final_response_output, final_response_overhead
                ))
                
                logger.info(f"Successfully recorded token usage for user {user_ms_object_id}")
                return True
                    
        except Exception as e:
            logger.error(f"Error recording token usage for user {user_ms_object_id}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def get_user_token_usage(user_ms_object_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve token usage statistics for a user.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Dict containing usage statistics or None if not found
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, total_queries,
                           context_analysis_input_tokens, context_analysis_output_tokens, context_analysis_overhead_tokens,
                           final_response_input_tokens, final_response_output_tokens, final_response_overhead_tokens,
                           created_at, updated_at
                    FROM powerbi_chat_token_usage 
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result:
                    return {
                        'user_ms_object_id': result[0],
                        'total_queries': result[1],
                        'context_analysis_input_tokens': result[2],
                        'context_analysis_output_tokens': result[3],
                        'context_analysis_overhead_tokens': result[4],
                        'final_response_input_tokens': result[5],
                        'final_response_output_tokens': result[6],
                        'final_response_overhead_tokens': result[7],
                        'created_at': result[8].isoformat() if result[8] else None,
                        'updated_at': result[9].isoformat() if result[9] else None
                    }
                return None
                    
        except Exception as e:
            logger.error(f"Error retrieving token usage for user {user_ms_object_id}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def get_all_token_usage() -> list:
        """
        Retrieve token usage statistics for all users.
        
        Returns:
            List of dictionaries containing usage statistics
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT user_ms_object_id, total_queries,
                           context_analysis_input_tokens, context_analysis_output_tokens, context_analysis_overhead_tokens,
                           final_response_input_tokens, final_response_output_tokens, final_response_overhead_tokens,
                           created_at, updated_at
                    FROM powerbi_chat_token_usage 
                    ORDER BY total_queries DESC, updated_at DESC
                """)
                
                results = cursor.fetchall()
                return [
                    {
                        'user_ms_object_id': row[0],
                        'total_queries': row[1],
                        'context_analysis_input_tokens': row[2],
                        'context_analysis_output_tokens': row[3],
                        'context_analysis_overhead_tokens': row[4],
                        'final_response_input_tokens': row[5],
                        'final_response_output_tokens': row[6],
                        'final_response_overhead_tokens': row[7],
                        'created_at': row[8].isoformat() if row[8] else None,
                        'updated_at': row[9].isoformat() if row[9] else None
                    }
                    for row in results
                ]
                    
        except Exception as e:
            logger.error(f"Error retrieving all token usage: {e}", exc_info=True)
            return []

# Singleton instance
token_tracking_service = TokenTrackingService()
