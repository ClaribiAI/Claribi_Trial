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


# Singleton instance
stats_service = StatsService()

