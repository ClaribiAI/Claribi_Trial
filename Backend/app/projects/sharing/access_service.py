"""
Access Service

This module provides access control, permission checks, and access logging
for project sharing functionality.
"""

from flask import current_app, request
import logging
from datetime import datetime
from app.models.project_access import AccessTypeEnum, SubjectTypeEnum
import ipaddress
import socket
import redis
import time
import json
from app.auth.middleware.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

class AccessService:
    """Service for managing access control and permissions"""

    @staticmethod
    def check_user_project_permission(conn, project_id, user_id, required_access_types):
        """Check if a user has sufficient permissions for a project
        
        Args:
            conn: Database connection
            project_id: The project ID
            user_id: The user's MS object ID
            required_access_types: List of access types that satisfy the permission check
            
        Returns:
            Tuple of (has_permission, access_type or None)
        """
        try:
            cursor = conn.cursor()
            
            # Format the access types for SQL IN clause
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
    def get_user_id_from_ms_object_id(conn, ms_object_id):
        """Get the numeric user ID from the ms_object_id"""
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id FROM users WHERE ms_object_id = %s
            """, (ms_object_id,))
            
            result = cursor.fetchone()
            if result:
                return result[0]
            return None
        except Exception as e:
            logger.error(f"Error getting user ID from ms_object_id: {str(e)}")
            return None

    @staticmethod
    def is_rate_limited(conn, share_link_id, user_id=None, client_ip=None):
        """Check if access attempts should be rate limited
        
        Rate limiting can be based on user ID, client IP, or both
        
        Args:
            conn: Database connection
            share_link_id: The share link ID
            user_id: The user's ID (optional)
            client_ip: The client's IP address (optional)
            
        Returns:
            Tuple of (is_limited, lockout_message or None)
        """
        try:
            # Get rate limit configuration
            rate_limit_config = current_app.config.get('SHARE_LINK_RATE_LIMIT', 
                                                    {'attempts': 5, 'period': 60, 'lockout': 30})
            
            # Generate rate limit key
            key_prefix = f"share_link:{share_link_id}"
            
            # Check user-based rate limiting if user_id is provided
            if user_id:
                user_key = f"{key_prefix}:user:{user_id}"
                allowed, count, _ = RateLimiter.check_rate_limit(
                    user_key, 
                    rate_limit_config['attempts'], 
                    rate_limit_config['period']
                )
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for user {user_id}: {count} failed attempts")
                    return True, f"Too many failed attempts. Please try again after {rate_limit_config['lockout']} minutes."
            
            # Check for IP-based rate limiting if client_ip is provided
            if client_ip:
                ip_key = f"{key_prefix}:ip:{client_ip}"
                allowed, count, _ = RateLimiter.check_rate_limit(
                    ip_key, 
                    rate_limit_config['attempts'], 
                    rate_limit_config['period']
                )
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for IP {client_ip}: {count} failed attempts")
                    return True, f"Too many failed attempts from your IP. Please try again after {rate_limit_config['lockout']} minutes."
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking rate limits: {str(e)}")
            # Default to allowing the request if there's an error checking rate limits
            return False, None

    @staticmethod
    def log_access_attempt(conn, share_link_id, ms_object_id=None, access_granted=False, notes=None):
        """Log an access attempt to a shared project
        
        Creates an audit trail of access attempts for security and compliance
        
        Args:
            conn: Database connection
            share_link_id: The share link ID
            ms_object_id: The user's MS object ID (optional)
            access_granted: Whether access was granted
            notes: Additional notes about the access attempt
        """
        try:
            cursor = conn.cursor()
            
            # Always log access attempts, even without share_link_id
            # This ensures we capture invalid token attempts
            
            # Get numeric user ID from ms_object_id if available
            user_id = None
            if ms_object_id:
                cursor.execute("""
                    SELECT id FROM users WHERE ms_object_id = %s
                """, (ms_object_id,))
                
                user_id_result = cursor.fetchone()
                if user_id_result:
                    user_id = user_id_result[0]
            
            # Get client IP address (with privacy considerations)
            client_ip = AccessService.get_client_ip()
            
            # Get additional metadata for the log
            user_agent = request.user_agent.string if request and hasattr(request, 'user_agent') else None
            
            # Create correlation ID for tracking related events
            #correlation_id = request.headers.get('X-Correlation-ID', None)
            
            # Create log entry with comprehensive metadata
            cursor.execute("""
                INSERT INTO project_share_access_logs
                (share_link_id, user_id, client_ip, access_granted, user_agent, notes, accessed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                share_link_id,
                user_id,  # Use the numeric user ID or NULL if not found
                client_ip,
                access_granted,
                user_agent,
                notes,
                datetime.utcnow()
            ))
            
            log_id = cursor.fetchone()[0]
            conn.commit()
            
            # Also log to application log for security monitoring
            log_message = f"Share access: link={share_link_id}, user={ms_object_id}, granted={access_granted}, notes={notes}"
            if access_granted:
                logger.info(log_message)
            else:
                logger.warning(log_message)
            
            return log_id
            
        except Exception as e:
            # Just log the error but don't raise - this is a non-critical operation
            logger.error(f"Error logging access attempt: {str(e)}")
            # Don't roll back the connection - let the calling function handle that
            return None

    @staticmethod
    def get_client_ip():
        """Get the client IP address from the request, respecting proxy headers"""
        try:
            # Check for X-Forwarded-For header (common with proxies)
            if request and request.headers.get('X-Forwarded-For'):
                # Get the leftmost IP address (original client)
                ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
                # Validate it's a proper IP address
                try:
                    ipaddress.ip_address(ip)
                    return ip
                except ValueError:
                    pass  # Invalid IP, fall back to other methods
            
            # Check for X-Real-IP header (common with nginx)
            if request and request.headers.get('X-Real-IP'):
                ip = request.headers.get('X-Real-IP')
                try:
                    ipaddress.ip_address(ip)
                    return ip
                except ValueError:
                    pass  # Invalid IP, fall back to other methods
            
            # Get remote address from request
            if request and request.remote_addr:
                return request.remote_addr
                
            return None
        except Exception as e:
            logger.error(f"Error getting client IP: {str(e)}")
            return None
            
    @staticmethod
    def grant_project_access(conn, project_id, user_ms_object_id, access_type, granted_by_ms_object_id=None):
        """Grant access to a project for a user
        
        Args:
            conn: Database connection
            project_id: The project ID
            user_ms_object_id: The target user's MS object ID
            access_type: Type of access to grant (from AccessTypeEnum)
            granted_by_ms_object_id: MS object ID of the user granting access
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            cursor = conn.cursor()
            
            # Check if granter has permission if provided
            if granted_by_ms_object_id:
                has_permission, _ = AccessService.check_user_project_permission(
                    conn,
                    project_id,
                    granted_by_ms_object_id,
                    [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
                )
                
                if not has_permission:
                    return False, "You don't have permission to grant access to this project"
            
            # Check if user already has access to this project
            cursor.execute("""
                SELECT access_type FROM project_access
                WHERE project_id = %s AND subject_type = %s AND subject_id = %s
            """, (project_id, SubjectTypeEnum.user.value, user_ms_object_id))
            
            existing_access = cursor.fetchone()
            
            if existing_access:
                # User already has some access, update it if needed
                existing_type = existing_access[0]
                
                # Don't downgrade owner access
                if existing_type == AccessTypeEnum.owner.value:
                    return True, "User already has owner access"
                    
                # Update access if it's different
                if existing_type != access_type:
                    cursor.execute("""
                        UPDATE project_access
                        SET access_type = %s, updated_at = %s
                        WHERE project_id = %s AND subject_type = %s AND subject_id = %s
                    """, (access_type, datetime.utcnow(), project_id, SubjectTypeEnum.user.value, user_ms_object_id))
                    
                    conn.commit()
                    
                    # Log the access change
                    if granted_by_ms_object_id:
                        notes = f"Access changed from {existing_type} to {access_type} by user {granted_by_ms_object_id}"
                        AccessService.log_access_attempt(conn, None, user_ms_object_id, True, notes)
                        
                    return True, f"Access changed from {existing_type} to {access_type}"
                else:
                    return True, f"User already has {access_type} access"
            else:
                # User doesn't have access yet, create new entry
                cursor.execute("""
                    INSERT INTO project_access
                    (project_id, subject_type, subject_id, access_type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (project_id, SubjectTypeEnum.user.value, user_ms_object_id, access_type, datetime.utcnow()))
                
                conn.commit()
                
                # Log the access grant
                if granted_by_ms_object_id:
                    notes = f"Access granted as {access_type} by user {granted_by_ms_object_id}"
                    AccessService.log_access_attempt(conn, None, user_ms_object_id, True, notes)
                    
                return True, f"Access granted as {access_type}"
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error granting project access: {str(e)}")
            return False, f"Error: {type(e).__name__}"
            
    @staticmethod
    def revoke_project_access(conn, project_id, user_ms_object_id, revoked_by_ms_object_id=None):
        """Revoke a user's access to a project
        
        Args:
            conn: Database connection
            project_id: The project ID
            user_ms_object_id: The target user's MS object ID
            revoked_by_ms_object_id: MS object ID of the user revoking access
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            cursor = conn.cursor()
            
            # Check if revoker has permission if provided
            if revoked_by_ms_object_id:
                # Don't allow users to revoke their own owner access
                if revoked_by_ms_object_id == user_ms_object_id:
                    cursor.execute("""
                        SELECT access_type FROM project_access
                        WHERE project_id = %s AND subject_type = %s AND subject_id = %s
                    """, (project_id, SubjectTypeEnum.user.value, user_ms_object_id))
                    
                    user_access = cursor.fetchone()
                    if user_access and user_access[0] == AccessTypeEnum.owner.value:
                        return False, "Cannot revoke your own owner access"
                
                # Check if revoker has permission
                has_permission, _ = AccessService.check_user_project_permission(
                    conn,
                    project_id,
                    revoked_by_ms_object_id,
                    [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
                )
                
                if not has_permission:
                    return False, "You don't have permission to revoke access to this project"
            
            # Check if user has access to this project
            cursor.execute("""
                SELECT access_type FROM project_access
                WHERE project_id = %s AND subject_type = %s AND subject_id = %s
            """, (project_id, SubjectTypeEnum.user.value, user_ms_object_id))
            
            existing_access = cursor.fetchone()
            
            if not existing_access:
                return False, "User does not have access to this project"
                
            # Don't allow revoking the last owner's access
            if existing_access[0] == AccessTypeEnum.owner.value:
                # Count how many owners this project has
                cursor.execute("""
                    SELECT COUNT(*) FROM project_access
                    WHERE project_id = %s AND subject_type = %s AND access_type = %s
                """, (project_id, SubjectTypeEnum.user.value, AccessTypeEnum.owner.value))
                
                owner_count = cursor.fetchone()[0]
                if owner_count <= 1:
                    return False, "Cannot revoke access for the last owner of the project"
            
            # Revoke access by deleting the entry
            cursor.execute("""
                DELETE FROM project_access
                WHERE project_id = %s AND subject_type = %s AND subject_id = %s
            """, (project_id, SubjectTypeEnum.user.value, user_ms_object_id))
            
            conn.commit()
            
            # Log the access revocation
            if revoked_by_ms_object_id:
                notes = f"Access revoked by user {revoked_by_ms_object_id}"
                AccessService.log_access_attempt(conn, None, user_ms_object_id, False, notes)
                
            return True, "Access revoked successfully"
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error revoking project access: {str(e)}")
            return False, f"Error: {type(e).__name__}"