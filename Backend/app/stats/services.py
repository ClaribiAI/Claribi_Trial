"""
Stats Service Module

Service for retrieving user statistics from the database.
"""
import logging
from typing import Dict, Any, Optional
from app.core.database import get_db_cursor
from app.config.settings import config

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
        Get usage counts and limits for a specific user.
        
        Args:
            user_ms_object_id: Microsoft Object ID from Azure AD authentication
            
        Returns:
            Dictionary containing usage statistics with limits:
            - documents_generated: Number of documents generated
            - chat_queries: Number of chat queries
            - documents_limit: Limit for documents (None if unlimited)
            - chat_limit: Limit for chat queries (None if unlimited)
            - plan_name: User's subscription plan name
        """
        try:
            # Lazy import to avoid circular dependency
            from app.services.token_limit_service import UsageLimitService
            
            # Get user stats (usage counts)
            stats = StatsService.get_user_stats(user_ms_object_id)
            
            # Get user's plan
            plan_name = UsageLimitService.get_user_plan(user_ms_object_id)
            
            # Normalize plan name
            plan_lower = plan_name.lower() if plan_name else 'none'
            if plan_lower == 'basic':
                plan_key = 'Basic'
            elif plan_lower == 'premium':
                plan_key = 'Premium'
            else:
                plan_key = 'none'
            
            # Get limits for this plan
            plan_limits = config.PLAN_USAGE_LIMITS.get(plan_key, config.PLAN_USAGE_LIMITS.get('none', {}))
            documents_limit = plan_limits.get('docs')
            chat_limit = plan_limits.get('chat')
            
            usage_data = {
                'documents_generated': stats.get('documents_generated', 0),
                'chat_queries': stats.get('chat_queries', 0),
                'documents_limit': documents_limit,
                'chat_limit': chat_limit,
                'plan_name': plan_name
            }
            
            # Check if approaching limits
            try:
                # Check docs approaching limit
                is_approaching_docs, _, _, remaining_docs, warning_docs = UsageLimitService.check_approaching_limit(
                    user_ms_object_id,
                    feature_type='docs'
                )
                if is_approaching_docs:
                    usage_data['documents_approaching_limit'] = True
                    usage_data['documents_warning_message'] = warning_docs
                    usage_data['documents_remaining'] = remaining_docs
                else:
                    usage_data['documents_approaching_limit'] = False
                    usage_data['documents_warning_message'] = None
                    usage_data['documents_remaining'] = remaining_docs if remaining_docs is not None else (documents_limit - stats.get('documents_generated', 0) if documents_limit is not None else None)
                
                # Check chat approaching limit
                is_approaching_chat, _, _, remaining_chat, warning_chat = UsageLimitService.check_approaching_limit(
                    user_ms_object_id,
                    feature_type='chat'
                )
                if is_approaching_chat:
                    usage_data['chat_approaching_limit'] = True
                    usage_data['chat_warning_message'] = warning_chat
                    usage_data['chat_remaining'] = remaining_chat
                else:
                    usage_data['chat_approaching_limit'] = False
                    usage_data['chat_warning_message'] = None
                    usage_data['chat_remaining'] = remaining_chat if remaining_chat is not None else (chat_limit - stats.get('chat_queries', 0) if chat_limit is not None else None)
            except Exception as approaching_check_error:
                # Log error but don't fail the request
                logger.error(f"Error checking approaching limits for user {user_ms_object_id}: {approaching_check_error}", exc_info=True)
                usage_data['documents_approaching_limit'] = False
                usage_data['documents_warning_message'] = None
                usage_data['chat_approaching_limit'] = False
                usage_data['chat_warning_message'] = None
            
            logger.info(f"Retrieved usage data for user {user_ms_object_id}: {usage_data}")
            return usage_data
            
        except Exception as e:
            logger.error(f"Error retrieving usage data for user {user_ms_object_id}: {e}", exc_info=True)
            # Return default usage data on error
            return {
                'documents_generated': 0,
                'chat_queries': 0,
                'documents_limit': None,
                'chat_limit': None,
                'plan_name': 'none'
            }


# Singleton instance
stats_service = StatsService()

