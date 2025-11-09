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


# Singleton instance
stats_service = StatsService()

