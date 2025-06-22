"""Project Sharing Service Module

This module provides a centralized service for managing project share links,
including creation, validation, extension, revocation, and access control.
"""

import logging
from typing import Dict, Any, Tuple, List, Optional, Union
from datetime import datetime, timedelta
import secrets
import ipaddress
import socket
from flask import current_app, request, g, url_for
from psycopg2.extras import DictCursor
import redis

from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ShareLinkError,
    ShareLinkExpiredError,
    ShareLinkInvalidError,
    ShareLinkMaxUsesError,
    ShareLinkDeactivatedError
)
from app.core.database import get_db_cursor
from app.projects.models.share_link import ShareLink
from app.projects.validators.sharing_validator import AccessTypeEnum
from app.auth.token.token_service import TokenService
from app.auth.middleware.rate_limiter import RateLimiter
from app.models.project_access import SubjectTypeEnum

logger = logging.getLogger(__name__)

class ProjectSharingService:
    """Service class for project sharing operations."""
    
    TOKEN_LENGTH = 32  # Length of share link tokens
    RATE_LIMIT_CONFIG = {
        'attempts': 5,
        'period': 60,  # seconds
        'lockout': 30  # minutes
    }
    
    @staticmethod
    def get_client_ip() -> Optional[str]:
        """Get client IP address with privacy considerations.
        
        Returns:
            str: Client IP address or None
        """
        try:
            # Try X-Forwarded-For header first
            if request.headers.get('X-Forwarded-For'):
                ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
            else:
                ip = request.remote_addr
                
            # Validate IP address
            if ip:
                # Convert to proper IP object to validate
                ipaddress.ip_address(ip)
                return ip
            return None
        except Exception as e:
            logger.error(f"Error getting client IP: {str(e)}")
            return None
    
    @staticmethod
    def check_user_project_permission(
        project_id: int,
        user_id: str,
        required_access_types: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """Check if a user has sufficient permissions for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            required_access_types: List of access types that satisfy the permission check
            
        Returns:
            tuple: (has_permission, access_type or None)
        """
        try:
            with get_db_cursor() as cursor:
                # Format access types for SQL IN clause
                access_values = ",".join([f"'{access_type}'" for access_type in required_access_types])
                
                cursor.execute(f"""
                    SELECT access_type FROM project_access 
                    WHERE project_id = %s AND subject_type = %s AND subject_id = %s 
                    AND access_type IN ({access_values})
                """, (project_id, SubjectTypeEnum.user.value, user_id))
                
                result = cursor.fetchone()
                if result:
                    return True, result[0]
                return False, None
        except Exception as e:
            logger.error(f"Error checking user project permission: {str(e)}")
            return False, None
            
    @staticmethod
    def is_rate_limited(
        share_link_id: int,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """Check if access attempts should be rate limited.
        
        Args:
            share_link_id: Share link ID
            user_id: Optional user's ms_object_id
            client_ip: Optional client IP address
            
        Returns:
            tuple: (is_limited, lockout_message or None)
        """
        try:
            key_prefix = f"share_link:{share_link_id}"
            
            # Check user-based rate limiting
            if user_id:
                user_key = f"{key_prefix}:user:{user_id}"
                allowed, count, _ = RateLimiter.check_rate_limit(
                    user_key,
                    ProjectSharingService.RATE_LIMIT_CONFIG['attempts'],
                    ProjectSharingService.RATE_LIMIT_CONFIG['period']
                )
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for user {user_id}: {count} attempts")
                    return True, f"Too many attempts. Please try again after {ProjectSharingService.RATE_LIMIT_CONFIG['lockout']} minutes."
            
            # Check IP-based rate limiting
            if client_ip:
                ip_key = f"{key_prefix}:ip:{client_ip}"
                allowed, count, _ = RateLimiter.check_rate_limit(
                    ip_key,
                    ProjectSharingService.RATE_LIMIT_CONFIG['attempts'],
                    ProjectSharingService.RATE_LIMIT_CONFIG['period']
                )
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for IP {client_ip}: {count} attempts")
                    return True, f"Too many attempts from your IP. Please try again after {ProjectSharingService.RATE_LIMIT_CONFIG['lockout']} minutes."
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking rate limits: {str(e)}")
            return False, None
            
    @staticmethod
    def log_access_attempt(
        share_link_id: Optional[int],
        ms_object_id: Optional[str] = None,
        access_granted: bool = False,
        notes: Optional[str] = None
    ) -> Optional[int]:
        """Log an access attempt to a shared project.
        
        Args:
            share_link_id: Optional share link ID
            ms_object_id: Optional user's ms_object_id
            access_granted: Whether access was granted
            notes: Additional notes about the access attempt
            
        Returns:
            int: Log entry ID or None on error
        """
        try:
            with get_db_cursor() as cursor:
                # Get numeric user ID if ms_object_id provided
                user_id = None
                if ms_object_id:
                    cursor.execute("""
                        SELECT id FROM users WHERE ms_object_id = %s
                    """, (ms_object_id,))
                    
                    user_id_result = cursor.fetchone()
                    if user_id_result:
                        user_id = user_id_result[0]
                
                # Get client info
                client_ip = ProjectSharingService.get_client_ip()
                user_agent = request.user_agent.string if request and hasattr(request, 'user_agent') else None
                
                # Create log entry
                cursor.execute("""
                    INSERT INTO project_share_access_logs
                    (share_link_id, user_id, client_ip, access_granted, user_agent, notes, accessed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    share_link_id,
                    user_id,
                    client_ip,
                    access_granted,
                    user_agent,
                    notes,
                    datetime.utcnow()
                ))
                
                log_id = cursor.fetchone()[0]
                
                # Log to application log
                log_message = f"Share access: link={share_link_id}, user={ms_object_id}, granted={access_granted}, notes={notes}"
                if access_granted:
                    logger.info(log_message)
                else:
                    logger.warning(log_message)
                
                return log_id
                
        except Exception as e:
            logger.error(f"Error logging access attempt: {str(e)}")
            return None
    
    @staticmethod
    def generate_share_link(
        project_id: int,
        user_id: str,
        expiry_hours: Optional[int] = None,
        access_type: str = AccessTypeEnum.reader
    ) -> Tuple[Optional[str], Optional[str]]:
        """Generate a new share link for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            expiry_hours: Optional hours until link expires
            access_type: Type of access to grant (reader/co_owner)
            
        Returns:
            tuple: (Share URL or None, Error message or None)
        """
        try:
            with get_db_cursor() as cursor:
                # Get numeric user ID from ms_object_id
                cursor.execute("""
                    SELECT id FROM users WHERE ms_object_id = %s
                """, (user_id,))
                
                user_id_result = cursor.fetchone()
                if not user_id_result:
                    return None, "User ID not found"
                    
                numeric_user_id = user_id_result['id']

                # Generate secure token
                token, expires_at = TokenService.generate_share_token(project_id, user_id, expiry_hours)
                if not token:
                    return None, "Failed to generate secure token"
                
                # Create share link
                cursor.execute('''
                    INSERT INTO project_share_links (
                        project_id, encrypted_token, created_by_user_id, created_at,
                        expires_at, access_count, access_type, is_revoked
                    ) VALUES (
                        %s, %s, %s, %s, %s, 0, %s, false
                    ) RETURNING id
                ''', (
                    project_id,
                    token,
                    numeric_user_id,
                    datetime.now(),
                    expires_at,
                    access_type
                ))
                
                link_id = cursor.fetchone()[0]
                
                # Generate the full URL with scheme set based on environment
                # Use HTTP for local development
                scheme = 'http' if request.host.startswith('127.0.0.1') or request.host.startswith('localhost') else 'https'
                share_url = url_for('projects.project_sharing.access_shared_project', token=token, _external=True, _scheme=scheme)
                
                return share_url, None
                
        except Exception as e:
            logger.error(f"Error generating share link: {str(e)}")
            return None, f"Failed to generate share link: {type(e).__name__}"
    
    @staticmethod
    def get_project_shares(
        project_id: int,
        user_id: str
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """Get sharing information for a project."""
        try:
            with get_db_cursor() as cursor:
                # Get active share links
                cursor.execute('''
                    SELECT * FROM project_share_links
                    WHERE project_id = %s
                    AND is_revoked = false
                    ORDER BY created_at DESC
                ''', (project_id,))
                
                share_links = []
                for row in cursor.fetchall():
                    link_data = dict(row)
                    # Convert is_revoked to is_active for frontend compatibility
                    link_data['is_active'] = not link_data['is_revoked'] and (
                        link_data['expires_at'] is None or 
                        link_data['expires_at'] > datetime.now()
                    )
                    link = ShareLink.from_db_dict(link_data)
                    share_links.append(link.to_dict())
                
                # Get users with access
                cursor.execute('''
                    SELECT u.id, u.display_id, pa.access_type, pa.created_at as granted_at
                    FROM project_access pa
                    JOIN users u ON pa.subject_id = u.ms_object_id
                    WHERE pa.project_id = %s
                    AND pa.subject_type = 'user'
                    ORDER BY pa.created_at DESC
                ''', (project_id,))
                
                users = [{
                    'user_id': row['id'],
                    'display_id': row['display_id'] or 'Unknown User',
                    'access_type': row['access_type'],
                    'access_granted_at': row['granted_at']
                } for row in cursor.fetchall()]
                
                return {
                    'share_links': share_links,
                    'users': users
                }, None
                
        except Exception as e:
            logger.error(f"Error getting project shares: {str(e)}")
            return None, "Failed to get sharing information"
    
    @staticmethod
    def extend_share_link(
        project_id: int,
        user_id: str,
        extension_hours: int,
        access_type: Optional[str] = None,
        share_link_id: Optional[int] = None
    ) -> Tuple[bool, Optional[str]]:
        """Extend a share link's expiration.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            extension_hours: Hours to extend by
            access_type: Optional access type to filter by
            share_link_id: Optional specific link ID to extend
            
        Returns:
            tuple: (Success boolean, Error message or None)
        """
        try:
            with get_db_cursor() as cursor:
                # Build query conditions
                conditions = ["project_id = %s", "is_revoked = false"]
                params = [project_id]
                
                if access_type:
                    conditions.append("access_type = %s")
                    params.append(access_type)
                
                if share_link_id:
                    conditions.append("id = %s")
                    params.append(share_link_id)
                
                # Get links to extend
                cursor.execute(f'''
                    SELECT * FROM project_share_links
                    WHERE {' AND '.join(conditions)}
                ''', params)
                
                links = [ShareLink.from_db_dict(dict(row)) for row in cursor.fetchall()]
                
                if not links:
                    return False, "No active share links found"
                
                # Extend each link
                for link in links:
                    link.extend_expiry(extension_hours)
                    cursor.execute('''
                        UPDATE project_share_links
                        SET expires_at = %s
                        WHERE id = %s
                    ''', (link.expires_at, link.id))
                
                return True, None
                
        except Exception as e:
            logger.error(f"Error extending share link: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def revoke_share_link(
        project_id: int,
        user_id: str,
        revoke_access: bool = False,
        access_type: Optional[str] = None,
        share_link_id: Optional[int] = None
    ) -> Tuple[bool, Optional[str]]:
        """Revoke a share link and optionally remove granted access.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            revoke_access: Whether to revoke access for users who used the link
            access_type: Optional access type to filter by
            share_link_id: Optional specific link ID to revoke
            
        Returns:
            tuple: (Success boolean, Error message or None)
        """
        try:
            with get_db_cursor() as cursor:
                # Build query conditions
                conditions = ["project_id = %s", "is_revoked = false"]
                params = [project_id]
                
                if access_type:
                    conditions.append("access_type = %s")
                    params.append(access_type)
                
                if share_link_id:
                    conditions.append("id = %s")
                    params.append(share_link_id)
                
                # Deactivate matching links
                cursor.execute(f'''
                    UPDATE project_share_links
                    SET is_revoked = true
                    WHERE {' AND '.join(conditions)}
                    RETURNING id, access_type
                ''', params)
                
                deactivated = cursor.fetchall()
                if not deactivated:
                    return False, "No active share links found"
                
                if revoke_access:
                    # Get users who gained access through these links
                    link_ids = [row['id'] for row in deactivated]
                    access_types = set(row['access_type'] for row in deactivated)
                    
                    # Remove access for users who gained it through these links
                    cursor.execute('''
                        DELETE FROM project_access
                        WHERE project_id = %s
                        AND access_type = ANY(%s)
                        AND source_link_id = ANY(%s)
                    ''', (project_id, list(access_types), link_ids))
                
                return True, None
                
        except Exception as e:
            logger.error(f"Error revoking share link: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def process_shared_link(token: str, current_user: Optional[Dict[str, Any]] = None) -> Tuple[Optional[Dict[str, Any]], str]:
        """Process a shared link access attempt.
        
        Args:
            token: Share link token
            current_user: Optional current user info
            
        Returns:
            tuple: (Project dict or None, Status message)
        """
        try:
            # Verify and decrypt token
            token_data = TokenService.verify_share_token(token)
            if not token_data:
                ProjectSharingService.log_access_attempt(
                    None,
                    current_user.get('ms_object_id') if current_user else None,
                    False,
                    "Invalid or expired token"
                )
                return None, "invalid_link"
            
            with get_db_cursor() as cursor:
                # Get share link
                cursor.execute('''
                    SELECT sl.*, p.*
                    FROM project_share_links sl
                    JOIN projects p ON sl.project_id = p.id
                    WHERE sl.encrypted_token = %s
                    AND sl.is_revoked = false
                ''', (token,))
                
                result = cursor.fetchone()
                if not result:
                    return None, "invalid_link"
                
                link_data = {k: result[k] for k in ShareLink.__dataclass_fields__}
                # Convert is_revoked to is_active for frontend compatibility
                link_data['is_active'] = not link_data['is_revoked'] and (
                    link_data['expires_at'] is None or 
                    link_data['expires_at'] > datetime.now()
                )
                link = ShareLink.from_db_dict(link_data)
                
                # Check rate limiting
                client_ip = ProjectSharingService.get_client_ip()
                is_limited, limit_message = ProjectSharingService.is_rate_limited(
                    link.id,
                    current_user.get('ms_object_id') if current_user else None,
                    client_ip
                )
                
                if is_limited:
                    ProjectSharingService.log_access_attempt(
                        link.id,
                        current_user.get('ms_object_id') if current_user else None,
                        False,
                        f"Rate limit exceeded: {limit_message}"
                    )
                    return None, "rate_limited"
                
                # Check link validity
                if not link.is_active:
                    ProjectSharingService.log_access_attempt(
                        link.id,
                        current_user.get('ms_object_id') if current_user else None,
                        False,
                        "Link is inactive"
                    )
                    return None, "link_inactive"
                    
                if link.is_expired:
                    ProjectSharingService.log_access_attempt(
                        link.id,
                        current_user.get('ms_object_id') if current_user else None,
                        False,
                        "Link has expired"
                    )
                    return None, "link_expired"
                    
                if link.has_reached_max_uses:
                    ProjectSharingService.log_access_attempt(
                        link.id,
                        current_user.get('ms_object_id') if current_user else None,
                        False,
                        "Link has reached maximum uses"
                    )
                    return None, "max_uses_reached"
                
                # Check if authentication required
                if link.access_type == AccessTypeEnum.co_owner and not current_user:
                    return None, "authentication_required"
                
                # If user is authenticated, check existing access
                if current_user:
                    cursor.execute('''
                        SELECT access_type FROM project_access
                        WHERE project_id = %s
                        AND subject_type = 'user'
                        AND subject_id = %s
                    ''', (link.project_id, current_user['ms_object_id']))
                    
                    existing = cursor.fetchone()
                    if existing:
                        ProjectSharingService.log_access_attempt(
                            link.id,
                            current_user['ms_object_id'],
                            True,
                            "User already has access"
                        )
                        return {
                            'id': link.project_id,
                            'access_type': existing['access_type']
                        }, "already_has_access"
                
                # Grant access
                if current_user:
                    cursor.execute('''
                        INSERT INTO project_access (
                            project_id, subject_type, subject_id,
                            access_type, granted_at, source_link_id
                        ) VALUES (
                            %s, 'user', %s, %s, %s, %s
                        )
                    ''', (
                        link.project_id,
                        current_user['ms_object_id'],
                        link.access_type,
                        datetime.now(),
                        link.id
                    ))
                
                # Update access count and last accessed
                cursor.execute('''
                    UPDATE project_share_links
                    SET access_count = access_count + 1,
                        last_accessed_at = %s
                    WHERE id = %s
                ''', (datetime.now(), link.id))
                
                ProjectSharingService.log_access_attempt(
                    link.id,
                    current_user.get('ms_object_id') if current_user else None,
                    True,
                    f"Access granted with {link.access_type} permissions"
                )
                
                return {
                    'id': link.project_id,
                    'access_type': link.access_type
                }, "access_granted"
                
        except Exception as e:
            logger.error(f"Error processing share link: {str(e)}")
            ProjectSharingService.log_access_attempt(
                None,
                current_user.get('ms_object_id') if current_user else None,
                False,
                f"Error: {str(e)}"
            )
            return None, "error"
    
    @staticmethod
    def get_share_link_analytics(project_id: int, user_id: str) -> Tuple[Dict[str, Any], Optional[str]]:
        """Get analytics for project share links.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            tuple: (Analytics dict or None, Error message or None)
        """
        try:
            with get_db_cursor() as cursor:
                # Get all share links with access logs
                cursor.execute('''
                    SELECT 
                        sl.*,
                        COUNT(al.id) as total_accesses,
                        COUNT(DISTINCT al.user_id) as unique_users,
                        MAX(al.accessed_at) as last_accessed,
                        COUNT(CASE WHEN al.access_granted THEN 1 END) as successful_accesses,
                        COUNT(CASE WHEN NOT al.access_granted THEN 1 END) as failed_accesses
                    FROM project_share_links sl
                    LEFT JOIN project_share_access_logs al ON sl.id = al.share_link_id
                    WHERE sl.project_id = %s
                    GROUP BY sl.id
                    ORDER BY sl.created_at DESC
                ''', (project_id,))
                
                links = []
                for row in cursor.fetchall():
                    link_data = dict(row)
                    
                    # Get recent access attempts
                    cursor.execute('''
                        SELECT 
                            al.*,
                            u.name as user_name
                        FROM project_share_access_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.share_link_id = %s
                        ORDER BY al.accessed_at DESC
                        LIMIT 10
                    ''', (link_data['id'],))
                    
                    recent_attempts = [dict(row) for row in cursor.fetchall()]
                    link_data['recent_attempts'] = recent_attempts
                    
                    links.append(link_data)
                
                # Get overall project sharing stats
                cursor.execute('''
                    SELECT 
                        COUNT(DISTINCT pa.subject_id) as total_shared_users,
                        COUNT(DISTINCT CASE WHEN pa.access_type = 'co_owner' THEN pa.subject_id END) as co_owner_count,
                        COUNT(DISTINCT CASE WHEN pa.access_type = 'reader' THEN pa.subject_id END) as reader_count,
                        MAX(pa.granted_at) as last_access_granted
                    FROM project_access pa
                    WHERE pa.project_id = %s
                    AND pa.subject_type = 'user'
                ''', (project_id,))
                
                stats = dict(cursor.fetchone())
                
                return {
                    'share_links': links,
                    'stats': stats
                }, None
                
        except Exception as e:
            logger.error(f"Error getting share link analytics: {str(e)}")
            return None, "Failed to get analytics"
    
    @staticmethod
    def cleanup_expired_links() -> int:
        """Cleanup expired share links and remove associated access.
        
        Returns:
            int: Number of links cleaned up
        """
        try:
            with get_db_cursor() as cursor:
                # Get expired links
                cursor.execute('''
                    SELECT id, project_id, access_type
                    FROM project_share_links
                    WHERE is_revoked = false
                    AND (
                        expires_at < NOW()
                        OR (max_uses IS NOT NULL AND access_count >= max_uses)
                    )
                ''')
                
                expired = cursor.fetchall()
                if not expired:
                    return 0
                
                # Group by project and access type for efficient cleanup
                cleanup_map = {}
                for link in expired:
                    key = (link['project_id'], link['access_type'])
                    if key not in cleanup_map:
                        cleanup_map[key] = []
                    cleanup_map[key].append(link['id'])
                
                # Cleanup access granted through expired links
                for (project_id, access_type), link_ids in cleanup_map.items():
                    cursor.execute('''
                        DELETE FROM project_access
                        WHERE project_id = %s
                        AND access_type = %s
                        AND source_link_id = ANY(%s)
                    ''', (project_id, access_type, link_ids))
                
                # Mark expired links as revoked
                link_ids = [link['id'] for link in expired]
                cursor.execute('''
                    UPDATE project_share_links
                    SET is_revoked = true
                    WHERE id = ANY(%s)
                ''', (link_ids,))
                
                # Log cleanup
                logger.info(f"Cleaned up {len(expired)} expired share links")
                
                return len(expired)
                
        except Exception as e:
            logger.error(f"Error cleaning up expired links: {str(e)}")
            return 0 