"""Project Analytics Service Module

This module provides analytics functionality for projects.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db_cursor
from app.core.cache import cache
from app.core.logging import get_logger
from app.core.exceptions import ProjectNotFoundError, ProjectAccessDeniedError

logger = get_logger(__name__)

class ProjectAnalyticsService:
    """Service class for project analytics operations."""
    
    CACHE_TTL = 300  # 5 minutes cache
    
    @staticmethod
    def get_project_analytics(
        project_id: int,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get analytics data for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ID requesting analytics
            start_date: Optional start date for analytics range
            end_date: Optional end date for analytics range
            
        Returns:
            dict: Analytics data
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        # Set default date range if not provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
            
        # Try to get from cache first
        cache_key = cache.key(
            'project_analytics',
            project_id,
            user_id,
            start_date.isoformat(),
            end_date.isoformat()
        )
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
            
        with get_db_cursor() as cursor:
            # Verify project exists and user has access
            cursor.execute('''
                SELECT EXISTS(
                    SELECT 1 
                    FROM projects p
                    JOIN project_access pa ON p.id = pa.project_id
                    WHERE p.id = %s
                    AND pa.subject_id = %s
                    AND p.status != 'Deleted'
                )
            ''', (project_id, user_id))
            
            if not cursor.fetchone()[0]:
                raise ProjectNotFoundError()
                
            # Get analytics data
            cursor.execute('''
                SELECT 
                    COUNT(DISTINCT a.id) as total_actions,
                    COUNT(DISTINCT a.user_id) as unique_users,
                    STRING_AGG(DISTINCT a.action_type, ', ') as action_types
                FROM project_actions a
                WHERE a.project_id = %s
                AND a.created_at BETWEEN %s AND %s
            ''', (project_id, start_date, end_date))
            
            row = cursor.fetchone()
            if not row:
                return {
                    'total_actions': 0,
                    'unique_users': 0,
                    'action_types': []
                }
                
            # Get action breakdown
            cursor.execute('''
                SELECT 
                    action_type,
                    COUNT(*) as count
                FROM project_actions
                WHERE project_id = %s
                AND created_at BETWEEN %s AND %s
                GROUP BY action_type
            ''', (project_id, start_date, end_date))
            
            action_breakdown = {
                row['action_type']: row['count']
                for row in cursor.fetchall()
            }
            
            # Compile analytics data
            analytics = {
                'total_actions': row['total_actions'],
                'unique_users': row['unique_users'],
                'action_types': row['action_types'].split(', ') if row['action_types'] else [],
                'action_breakdown': action_breakdown,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
            
            # Cache the results
            cache.set(cache_key, analytics, ProjectAnalyticsService.CACHE_TTL)
            
            return analytics
            
    @staticmethod
    def record_project_action(
        project_id: int,
        user_id: str,
        action_type: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record a project action for analytics.
        
        Args:
            project_id: Project ID
            user_id: User performing the action
            action_type: Type of action performed
            details: Optional additional details about the action
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute('''
                    INSERT INTO project_actions (
                        project_id,
                        user_id,
                        action_type,
                        details,
                        created_at
                    ) VALUES (%s, %s, %s, %s, NOW())
                ''', (project_id, user_id, action_type, details))
                
                # Invalidate analytics cache for this project
                cache.delete_pattern(f"project_analytics:{project_id}:*")
                
        except Exception as e:
            logger.error(f"Failed to record project action: {str(e)}")
            # Don't raise - analytics recording should not break main functionality

    @staticmethod
    def get_project_overview(project_id: int, user_id: str) -> Dict[str, Any]:
        """Get overview analytics for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            dict: Project overview analytics
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        cache_key = f"analytics:overview:project:{project_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
            
        with get_db_cursor() as cursor:
            # Check access
            cursor.execute('''
                SELECT access_type 
                FROM project_access 
                WHERE project_id = %s AND subject_id = %s
            ''', (project_id, user_id))
            
            if not cursor.fetchone():
                raise ProjectAccessDeniedError()
            
            # Get project stats
            cursor.execute('''
                SELECT 
                    p.*,
                    COUNT(DISTINCT pa.subject_id) as collaborator_count,
                    COUNT(DISTINCT sl.id) as share_link_count
                FROM projects p
                LEFT JOIN project_access pa ON p.id = pa.project_id
                LEFT JOIN share_links sl ON p.id = sl.project_id
                WHERE p.id = %s
                GROUP BY p.id
            ''', (project_id,))
            
            project = cursor.fetchone()
            if not project:
                raise ProjectNotFoundError()
            
            analytics = {
                'project_id': project['id'],
                'created_at': project['created_at'].isoformat(),
                'last_modified': project['updated_at'].isoformat(),
                'collaborator_count': project['collaborator_count'],
                'share_link_count': project['share_link_count'],
                'status': project['status']
            }
            
            cache.set(cache_key, analytics, ProjectAnalyticsService.CACHE_TTL)
            return analytics
    
    @staticmethod
    def get_sharing_analytics(project_id: int, user_id: str) -> Dict[str, Any]:
        """Get sharing analytics for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            dict: Project sharing analytics
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        cache_key = f"analytics:sharing:project:{project_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
            
        with get_db_cursor() as cursor:
            # Check access
            cursor.execute('''
                SELECT access_type 
                FROM project_access 
                WHERE project_id = %s AND subject_id = %s
            ''', (project_id, user_id))
            
            if not cursor.fetchone():
                raise ProjectAccessDeniedError()
            
            # Get sharing stats
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_shares,
                    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_shares,
                    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_shares,
                    SUM(access_count) as total_accesses
                FROM share_links
                WHERE project_id = %s
            ''', (project_id,))
            
            sharing = cursor.fetchone()
            if not sharing:
                raise ProjectNotFoundError()
            
            analytics = {
                'total_shares': sharing['total_shares'],
                'active_shares': sharing['active_shares'],
                'expired_shares': sharing['expired_shares'],
                'total_accesses': sharing['total_accesses'] or 0
            }
            
            cache.set(cache_key, analytics, ProjectAnalyticsService.CACHE_TTL)
            return analytics
    
    @staticmethod
    def get_activity_analytics(project_id: int, user_id: str) -> Dict[str, Any]:
        """Get activity analytics for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            dict: Project activity analytics
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        cache_key = f"analytics:activity:project:{project_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
            
        with get_db_cursor() as cursor:
            # Check access
            cursor.execute('''
                SELECT access_type 
                FROM project_access 
                WHERE project_id = %s AND subject_id = %s
            ''', (project_id, user_id))
            
            if not cursor.fetchone():
                raise ProjectAccessDeniedError()
            
            # Get activity stats for last 30 days
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            cursor.execute('''
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as activity_count,
                    activity_type
                FROM project_activity_log
                WHERE project_id = %s
                AND created_at >= %s
                GROUP BY DATE(created_at), activity_type
                ORDER BY date DESC
            ''', (project_id, thirty_days_ago))
            
            activities = cursor.fetchall()
            
            analytics = {
                'daily_activity': [
                    {
                        'date': row['date'].isoformat(),
                        'count': row['activity_count'],
                        'type': row['activity_type']
                    }
                    for row in activities
                ],
                'period_start': thirty_days_ago.date().isoformat(),
                'period_end': datetime.now().date().isoformat()
            }
            
            cache.set(cache_key, analytics, ProjectAnalyticsService.CACHE_TTL)
            return analytics 