"""
Stats Service Module

Service for retrieving user statistics from the database.
"""
import logging
from typing import Dict, Any, Optional
from app.core.database import get_db_cursor

logger = logging.getLogger(__name__)


class StatsService:
    """
    Service for retrieving user statistics.
    Provides methods to get aggregated statistics from token usage tables.
    """
    
    @staticmethod
    def get_user_stats(user_ms_object_id: str) -> Dict[str, Any]:
        """
        Get statistics for a specific user.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Dictionary containing user statistics:
            - documents_generated: Sum of generation_count from powerbi_docs_token_usage
            - chat_queries: total_queries from powerbi_chat_token_usage
            - time_saved: Placeholder value (can be calculated later)
        """
        try:
            stats = {
                'documents_generated': 0,
                'chat_queries': 0,
                'time_saved': 0.0
            }
            
            # Get documents generated count (sum of generation_count)
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT COALESCE(SUM(generation_count), 0)
                    FROM powerbi_docs_token_usage
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result and result[0] is not None:
                    stats['documents_generated'] = int(result[0])
            
            # Get chat queries count
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT COALESCE(total_queries, 0)
                    FROM powerbi_chat_token_usage
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result and result[0] is not None:
                    stats['chat_queries'] = int(result[0])
            
            # Calculate time saved (placeholder - can be enhanced later)
            # For now, we'll use a simple calculation based on documents and queries
            # Assuming each document saves ~2 hours and each query saves ~0.1 hours
            stats['time_saved'] = round(
                (stats['documents_generated'] * 2.0) + (stats['chat_queries'] * 0.1),
                1
            )
            
            logger.info(f"Retrieved stats for user {user_ms_object_id}: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error retrieving stats for user {user_ms_object_id}: {e}", exc_info=True)
            # Return default stats on error
            return {
                'documents_generated': 0,
                'chat_queries': 0,
                'time_saved': 0.0
            }
    
    @staticmethod
    def get_user_stats_breakdown(user_ms_object_id: str) -> Dict[str, Any]:
        """
        Get statistics breakdown by PBIX file (collection_name) for a specific user.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Dictionary containing breakdown:
            - documents_breakdown: List of dicts with collection_name and generation_count
            - chat_queries: Total queries (not broken down by file as table doesn't support it)
        """
        try:
            breakdown = {
                'documents_breakdown': [],
                'chat_queries': 0,
                'chat_queries_breakdown_available': False
            }
            
            # Get documents breakdown by collection_name (PBIX file) with actual filename
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT 
                        pdtu.collection_name,
                        COALESCE(pfs.filename, pdtu.collection_name) as filename,
                        SUM(pdtu.generation_count) as total_generations
                    FROM powerbi_docs_token_usage pdtu
                    LEFT JOIN powerbi_file_summaries pfs ON pdtu.collection_name = pfs.collection_name
                    WHERE pdtu.user_ms_object_id = %s
                    GROUP BY pdtu.collection_name, pfs.filename
                    ORDER BY total_generations DESC
                """, (user_ms_object_id,))
                
                results = cursor.fetchall()
                breakdown['documents_breakdown'] = [
                    {
                        'collection_name': row[0],
                        'filename': row[1] if row[1] else row[0],  # Use filename if available, fallback to collection_name
                        'generation_count': int(row[2]) if row[2] else 0
                    }
                    for row in results
                ]
            
            # Get total chat queries (can't break down by file as table doesn't track it)
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT COALESCE(total_queries, 0)
                    FROM powerbi_chat_token_usage
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result and result[0] is not None:
                    breakdown['chat_queries'] = int(result[0])
            
            logger.info(f"Retrieved stats breakdown for user {user_ms_object_id}")
            return breakdown
            
        except Exception as e:
            logger.error(f"Error retrieving stats breakdown for user {user_ms_object_id}: {e}", exc_info=True)
            # Return default breakdown on error
            return {
                'documents_breakdown': [],
                'chat_queries': 0,
                'chat_queries_breakdown_available': False
            }
    
    @staticmethod
    def get_user_token_usage(user_ms_object_id: str) -> Dict[str, Any]:
        """
        Get total token usage for a specific user by aggregating from both chat and docs tables.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Dictionary containing token usage statistics:
            - total_tokens: Combined total from both tables
            - chat_tokens: Total from chat table
            - docs_tokens: Total from docs table
            - chat_input_tokens: Sum of input tokens from chat
            - chat_output_tokens: Sum of output tokens from chat
            - chat_overhead_tokens: Sum of overhead tokens from chat
            - docs_input_tokens: Sum of input tokens from docs
            - docs_output_tokens: Sum of output tokens from docs
        """
        try:
            token_usage = {
                'total_tokens': 0,
                'chat_tokens': 0,
                'docs_tokens': 0,
                'chat_input_tokens': 0,
                'chat_output_tokens': 0,
                'chat_overhead_tokens': 0,
                'docs_input_tokens': 0,
                'docs_output_tokens': 0
            }
            
            # Get chat token usage - aggregate all token fields
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT 
                        COALESCE(SUM(context_analysis_input_tokens), 0),
                        COALESCE(SUM(context_analysis_output_tokens), 0),
                        COALESCE(SUM(context_analysis_overhead_tokens), 0),
                        COALESCE(SUM(final_response_input_tokens), 0),
                        COALESCE(SUM(final_response_output_tokens), 0),
                        COALESCE(SUM(final_response_overhead_tokens), 0)
                    FROM powerbi_chat_token_usage
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result:
                    context_input = int(result[0]) if result[0] is not None else 0
                    context_output = int(result[1]) if result[1] is not None else 0
                    context_overhead = int(result[2]) if result[2] is not None else 0
                    final_input = int(result[3]) if result[3] is not None else 0
                    final_output = int(result[4]) if result[4] is not None else 0
                    final_overhead = int(result[5]) if result[5] is not None else 0
                    
                    token_usage['chat_input_tokens'] = context_input + final_input
                    token_usage['chat_output_tokens'] = context_output + final_output
                    token_usage['chat_overhead_tokens'] = context_overhead + final_overhead
                    token_usage['chat_tokens'] = (
                        token_usage['chat_input_tokens'] + 
                        token_usage['chat_output_tokens'] + 
                        token_usage['chat_overhead_tokens']
                    )
            
            # Get docs token usage - aggregate input and output tokens
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT 
                        COALESCE(SUM(input_tokens), 0),
                        COALESCE(SUM(output_tokens), 0)
                    FROM powerbi_docs_token_usage
                    WHERE user_ms_object_id = %s
                """, (user_ms_object_id,))
                
                result = cursor.fetchone()
                if result:
                    token_usage['docs_input_tokens'] = int(result[0]) if result[0] is not None else 0
                    token_usage['docs_output_tokens'] = int(result[1]) if result[1] is not None else 0
                    token_usage['docs_tokens'] = (
                        token_usage['docs_input_tokens'] + 
                        token_usage['docs_output_tokens']
                    )
            
            # Calculate total tokens
            token_usage['total_tokens'] = token_usage['chat_tokens'] + token_usage['docs_tokens']
            
            logger.info(f"Retrieved token usage for user {user_ms_object_id}: total={token_usage['total_tokens']}")
            return token_usage
            
        except Exception as e:
            logger.error(f"Error retrieving token usage for user {user_ms_object_id}: {e}", exc_info=True)
            # Return default token usage on error
            return {
                'total_tokens': 0,
                'chat_tokens': 0,
                'docs_tokens': 0,
                'chat_input_tokens': 0,
                'chat_output_tokens': 0,
                'chat_overhead_tokens': 0,
                'docs_input_tokens': 0,
                'docs_output_tokens': 0
            }


# Singleton instance
stats_service = StatsService()

