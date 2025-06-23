"""Query Analytics Service

This module provides functionality for tracking and analyzing query usage across projects.
"""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from app.core.database import get_db_cursor
from app.core.cache import cache
from app.core.logging import get_logger
from app.core.exceptions import ProjectNotFoundError
from app.models.query_analytics import QueryAnalytics

logger = get_logger(__name__)

class QueryAnalyticsService:
    """Service class for query analytics operations."""
    
    CACHE_TTL = 300  # 5 minutes cache
    QUERY_TIME_SAVINGS = 5  # seconds saved per query

    @staticmethod
    def record_query(project_id: int, report_id: int) -> None:
        """Record a successful query execution.
        
        Args:
            project_id: Project ID
            report_id: Report ID
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                # Insert the query record
                cursor.execute('''
                    INSERT INTO query_analytics (
                        project_id,
                        report_id,
                        created_at
                    ) VALUES (%s, %s, NOW())
                ''', (project_id, report_id))
                
                logger.info(f"Query recorded for project {project_id} and report {report_id}")
                
                # Invalidate analytics cache
                cache.delete_pattern(f"query_analytics:*")
                
        except Exception as e:
            logger.error(f"Failed to record query: {str(e)}")
            # Don't raise - analytics recording should not break main functionality

    @staticmethod
    def get_query_analytics(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get aggregated query analytics across all live projects.
        
        Args:
            start_date: Optional start date for analytics range
            end_date: Optional end date for analytics range
            
        Returns:
            dict: Analytics data containing total queries and hours saved
        """
        # Set default date range if not provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
            
        # Try to get from cache first
        cache_key = cache.key(
            'query_analytics',
            start_date.isoformat(),
            end_date.isoformat()
        )
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
            
        with get_db_cursor(commit=True) as cursor:  # Add commit=True for consistent transaction handling
            # Get total queries from live projects
            cursor.execute('''
                SELECT COUNT(*) as total_queries
                FROM query_analytics qa
                JOIN projects p ON qa.project_id = p.id
                WHERE p.status = 'Live'
                AND qa.created_at BETWEEN %s AND %s
            ''', (start_date, end_date))
            
            row = cursor.fetchone()
            total_queries = row['total_queries'] if row else 0
            
            # Calculate hours saved
            hours_saved = (total_queries * QueryAnalyticsService.QUERY_TIME_SAVINGS) / 3600
            
            analytics = {
                'total_queries': total_queries,
                'hours_saved': round(hours_saved, 2),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
            
            # Cache the results
            cache.set(cache_key, analytics, QueryAnalyticsService.CACHE_TTL)
            
            return analytics 