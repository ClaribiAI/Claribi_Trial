"""
Link Service

This module provides a centralized service for managing project share links,
including creation, validation, extension, and revocation.
"""

from flask import current_app, url_for, request, g
import logging
from datetime import datetime, timedelta
from app.database.connection import get_db
from app.auth.token.token_service import TokenService
from app.projects.sharing.access_service import AccessService
from app.models.project_access import AccessTypeEnum, SubjectTypeEnum
import json

logger = logging.getLogger(__name__)

class LinkService:
    """Service for managing project share links"""
    
    @staticmethod
    def generate_share_link(project_id, user_id, expiration_hours=24, access_type = "co_owner"):
        """Generate a shareable link for a project
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            expiration_hours: How many hours the link should be valid for
            access_type: Type of access to grant (co_owner or reader)
            
        Returns:
            tuple: (share_url, error_message)
        """
        try:
            # Log incoming parameters for debugging
            logger.debug(f"generate_share_link called with project_id={project_id}, expiration_hours={expiration_hours} (type: {type(expiration_hours).__name__}), access_type={access_type}")
            
            # Validate access_type
            if access_type not in ["reader", "co_owner"]:
                logger.error(f"access_type: {access_type} is not valid")
                return None, "Invalid access type specified"
            
            # Convert expiration_hours to int if it's a string
            if expiration_hours is not None and isinstance(expiration_hours, str):
                try:
                    expiration_hours = int(expiration_hours)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid expiration_hours value: {expiration_hours}, defaulting to 24")
                    expiration_hours = 24
                    
            conn = get_db()
            cursor = conn.cursor()
            
            # Get numeric user ID from ms_object_id
            numeric_user_id = AccessService.get_user_id_from_ms_object_id(conn, user_id)
            if not numeric_user_id:
                return None, "User ID not found"
            
            # Check if user has permission to share (must be owner or admin)
            has_permission, _ = AccessService.check_user_project_permission(
                conn, 
                project_id, 
                user_id, 
                [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
            )
            
            if not has_permission:
                return None, "You don't have permission to share this project"
            
            # Store connection in Flask g context
            g.db = conn
            
            # Generate new secure token
            token, expires_at = TokenService.generate_share_token(project_id, user_id, expiration_hours)
            if not token:
                return None, "Failed to generate secure token"
            
            # Create share link object with encrypted token
            share_link = TokenService.create_share_link_object(project_id, user_id, token, expires_at, access_type)
            if not share_link:
                return None, "Failed to create share link"
            
            # Insert into database
            cursor.execute("""
                INSERT INTO project_share_links 
                (project_id, created_by_user_id, encrypted_token, expires_at, is_revoked, created_at, access_type) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                int(share_link['project_id']),
                numeric_user_id,
                share_link['encrypted_token'],
                share_link['expires_at'],
                share_link['is_revoked'],
                share_link['created_at'],
                access_type
            ))
            
            link_id = cursor.fetchone()[0]
            conn.commit()
            
            # Generate the full URL with scheme set based on environment
            # Use HTTP for local development
            scheme = 'http' if request.host.startswith('127.0.0.1') or request.host.startswith('localhost') else 'https'
            share_url = url_for('projects.access_shared_project', token=token, _external=True, _scheme=scheme)
            
            # # Log share link creation for audit trail
            # AccessService.log_access_attempt(
            #     conn, 
            #     link_id, 
            #     user_id, 
            #     True, 
            #     f"Share link created with {expiration_hours} hour expiration"
            # )
            
            return share_url, None
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error generating share link: {type(e).__name__}: {str(e)}")
            return None, f"Error: {type(e).__name__}"
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def extend_share_link(project_id, user_id, extension_hours=24, access_type=None):
        """Extend an existing share link's expiration
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            extension_hours: How many hours to extend the link by
            access_type: Optional, specify the type of link to extend (reader or co_owner)
            
        Returns:
            tuple: (success, error_message)
        """
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Check if user has permission to manage sharing (must be owner or admin)
            has_permission, _ = AccessService.check_user_project_permission(
                conn,
                project_id,
                user_id,
                [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
            )
            
            if not has_permission:
                return False, "You don't have permission to manage sharing for this project"
            
            # Store connection in Flask g context
            g.db = conn
            
            # Find the active share link
            if access_type:
                cursor.execute("""
                    SELECT id, expires_at FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE AND access_type = %s
                    ORDER BY created_at DESC LIMIT 1
                """, (project_id, access_type))
            else:
                cursor.execute("""
                    SELECT id, expires_at FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE
                    ORDER BY created_at DESC LIMIT 1
                """, (project_id,))
            
            share_link = cursor.fetchone()
            if not share_link:
                return False, "No active share link found"
            
            link_id, current_expiration = share_link
            
            # Calculate new expiration time
            if datetime.utcnow() > current_expiration:
                # If already expired, set from now
                new_expiration = datetime.utcnow() + timedelta(hours=extension_hours)
            else:
                # Otherwise extend from current expiration
                new_expiration = current_expiration + timedelta(hours=extension_hours)
            
            # Update the expiration time
            cursor.execute("""
                UPDATE project_share_links 
                SET expires_at = %s
                WHERE id = %s
            """, (new_expiration, link_id))
            
            # Log the extension for audit trail
            AccessService.log_access_attempt(
                conn,
                link_id,
                user_id,
                True,
                f"Share link expiration extended by {extension_hours} hours"
            )
            
            conn.commit()
            
            return True, None
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error extending share link: {str(e)}")
            return False, f"Error: {type(e).__name__}"
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def revoke_share_link(project_id, user_id, revoke_access=False, access_type=None, link_id=None):
        """Revoke existing share links for a project
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            revoke_access: Whether to also revoke access for existing users
            access_type: Optional - specific access type to revoke (co_owner or reader)
            link_id: Optional - specific link ID to revoke
            
        Returns:
            tuple: (success, error_message)
        """
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Check if user has permission to manage sharing (must be owner or admin)
            has_permission, _ = AccessService.check_user_project_permission(
                conn,
                project_id,
                user_id,
                [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
            )
            
            if not has_permission:
                return False, "You don't have permission to manage sharing for this project"
            
            # Store connection in Flask g context
            g.db = conn
            
            # Build query based on the parameters provided
            if link_id:
                # If a specific link ID is provided, only revoke that link
                query = """
                    SELECT id, encrypted_token, access_type FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE AND id = %s
                """
                params = (project_id, link_id)
            elif access_type and access_type in [AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value]:
                # If only access type is provided, revoke all links of that type
                query = """
                    SELECT id, encrypted_token, access_type FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE AND access_type = %s
                """
                params = (project_id, access_type)
            else:
                # If neither is provided, revoke all links for this project
                query = """
                    SELECT id, encrypted_token, access_type FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE
                """
                params = (project_id,)
            
            # Find active share links
            cursor.execute(query, params)
            
            share_links = cursor.fetchall()
            if not share_links:
                if link_id:
                    return False, f"No active share link found with ID {link_id}"
                else:
                    return False, f"No active share links found{' for ' + access_type if access_type else ''}"
            
            first_link_id = share_links[0][0] if share_links else None
            if not first_link_id:
                logger.warning(f"No link ID found for logging revocation for project {project_id}")
                return False, "No valid link ID found for logging"

            # Revoke all tokens in TokenService
            for link_id_db, encrypted_token, link_access_type in share_links:
                try:
                    # Decrypt token and revoke by token ID
                    token = TokenService.decrypt_token(encrypted_token)
                    if token:
                        TokenService.revoke_token(token)
                except Exception as e:
                    logger.warning(f"Could not revoke token in service: {str(e)}")
            
            # Use a transaction to ensure atomicity when revoking links and user access
            try:
                # Construct the UPDATE query based on parameters
                if link_id:
                    # If a specific link ID is provided, only revoke that link
                    revoke_query = """
                        UPDATE project_share_links SET is_revoked = TRUE
                        WHERE project_id = %s AND is_revoked = FALSE AND id = %s
                    """
                    revoke_params = (project_id, link_id)
                    
                    # Get the access type for this link for logging
                    access_type = share_links[0][2] if share_links and len(share_links[0]) > 2 else None
                elif access_type and access_type in [AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value]:
                    # If only access type is provided, revoke all links of that type
                    revoke_query = """
                        UPDATE project_share_links SET is_revoked = TRUE
                        WHERE project_id = %s AND is_revoked = FALSE AND access_type = %s
                    """
                    revoke_params = (project_id, access_type)
                else:
                    # If neither is provided, revoke all links for this project
                    revoke_query = """
                        UPDATE project_share_links SET is_revoked = TRUE
                        WHERE project_id = %s AND is_revoked = FALSE
                    """
                    revoke_params = (project_id,)
                
                # Execute the revocation query
                cursor.execute(revoke_query, revoke_params)
                
                # Determine the access type description for logging
                if access_type:
                    access_type_desc = "co-owner" if access_type == AccessTypeEnum.co_owner.value else "reader"
                else:
                    access_type_desc = ""
                
                # If requested, also revoke access for users
                if revoke_access:
                    if access_type and access_type in [AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value]:
                        cursor.execute("""
                            DELETE FROM project_access
                            WHERE project_id = %s AND access_type = %s
                        """, (project_id, access_type))
                        
                        # Log access revocation for specific type
                        AccessService.log_access_attempt(
                            conn,
                            first_link_id,
                            user_id,
                            True,
                            f"{access_type_desc} share links and access revoked"
                        )
                    else:
                        cursor.execute("""
                            DELETE FROM project_access
                            WHERE project_id = %s AND access_type IN (%s, %s)
                        """, (project_id, AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value))
                        
                        # Log access revocation
                        AccessService.log_access_attempt(
                            conn,
                            first_link_id,
                            user_id,
                            True,
                            "All share links and user access revoked"
                        )
                else:
                    # Log just link revocation
                    if link_id:
                        AccessService.log_access_attempt(
                            conn,
                            first_link_id,
                            user_id,
                            True,
                            f"Share link {link_id} revoked (user access preserved)"
                        )
                    elif access_type and access_type in [AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value]:
                        AccessService.log_access_attempt(
                            conn,
                            first_link_id,
                            user_id,
                            True,
                            f"{access_type_desc} share links revoked (user access preserved)"
                        )
                    else:
                        AccessService.log_access_attempt(
                            conn,
                            first_link_id,
                            user_id,
                            True,
                            "All share links revoked (user access preserved)"
                        )
                
                conn.commit()
                return True, None
            except Exception as e:
                conn.rollback()
                logger.error(f"Error during atomic revocation operation: {str(e)}")
                return False, "Failed to revoke access completely"
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error revoking share link: {str(e)}")
            return False, f"Error: {type(e).__name__}"
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def get_share_link_analytics(project_id, user_id):
        """Get analytics for a project's share link
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            
        Returns:
            tuple: (analytics_data, error_message)
        """
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Check if user has permission to view analytics
            has_permission, _ = AccessService.check_user_project_permission(
                conn,
                project_id,
                user_id,
                [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value, AccessTypeEnum.co_owner.value]
            )
            
            if not has_permission:
                return None, "You don't have permission to view this information"
            
            # Get share link info
            cursor.execute("""
                SELECT id, created_at, expires_at, is_revoked, access_count, last_accessed_at, access_type
                FROM project_share_links
                WHERE project_id = %s
                ORDER BY created_at DESC
                LIMIT 1
            """, (project_id,))
            
            share_link = cursor.fetchone()
            if not share_link:
                return {
                    'has_share_link': False,
                    'analytics': {
                        'successful_accesses': 0,
                        'failed_accesses': 0,
                        'recent_access': []
                    }
                }, None
                
            link_id, created_at, expires_at, is_revoked, access_count, last_accessed_at, access_type = share_link
            
            # Get access analytics
            cursor.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE access_granted = TRUE) as successful,
                    COUNT(*) FILTER (WHERE access_granted = FALSE) as failed
                FROM project_share_access_logs
                WHERE share_link_id = %s
            """, (link_id,))
            
            counts = cursor.fetchone()
            successful, failed = counts if counts else (0, 0)
            
            # Get recent access attempts
            cursor.execute("""
                SELECT a.accessed_at, a.access_granted, a.notes, a.client_ip, u.display_id
                FROM project_share_access_logs a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.share_link_id = %s
                ORDER BY a.accessed_at DESC
                LIMIT 10
            """, (link_id,))
            
            recent_access = [{
                'timestamp': record[0].isoformat() if record[0] else None,
                'granted': record[1],
                'message': record[2],
                'ip': record[3],
                'user': record[4] or 'Unknown User'
            } for record in cursor.fetchall()]
            
            analytics_data = {
                'has_share_link': True,
                'share_link': {
                    'id': link_id,
                    'created_at': created_at.isoformat() if created_at else None,
                    'expires_at': expires_at.isoformat() if expires_at else None,
                    'is_active': not is_revoked and (expires_at is None or expires_at > datetime.utcnow()),
                    'is_revoked': is_revoked,
                    'access_count': access_count or 0,
                    'last_accessed_at': last_accessed_at.isoformat() if last_accessed_at else None,
                    'access_type': access_type
                },
                'analytics': {
                    'successful_accesses': successful,
                    'failed_accesses': failed,
                    'recent_access': recent_access
                }
            }
            
            return analytics_data, None
            
        except Exception as e:
            logger.error(f"Error getting share link analytics: {str(e)}")
            return None, f"Error: {type(e).__name__}"
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def cleanup_expired_links():
        """Cleanup expired share links
        
        This function should be called periodically by a scheduled task
        
        Returns:
            int: Number of links cleaned up
        """
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Find all expired share links that haven't been revoked yet
            cursor.execute("""
                SELECT id, project_id, encrypted_token 
                FROM project_share_links
                WHERE expires_at < NOW() AND is_revoked = FALSE
            """)
            
            expired_links = cursor.fetchall()
            if not expired_links:
                logger.info("No expired share links to clean up")
                return 0
            
            # Update all expired links to be revoked
            link_ids = [link[0] for link in expired_links]
            id_list = ','.join(str(id) for id in link_ids)
            
            cursor.execute(f"""
                UPDATE project_share_links
                SET is_revoked = TRUE
                WHERE id IN ({id_list})
            """)
            
            # Revoke tokens in TokenService
            for _, _, encrypted_token in expired_links:
                try:
                    # Decrypt token and revoke by token ID
                    token = TokenService.decrypt_token(encrypted_token)
                    if token:
                        TokenService.revoke_token(token)
                except Exception as e:
                    logger.warning(f"Could not revoke token in service: {str(e)}")
            
            # Log the cleanup
            logger.info(f"Cleaned up {len(expired_links)} expired share links")
            
            # Commit the changes
            conn.commit()
            
            return len(expired_links)
            
        except Exception as e:
            logger.error(f"Error cleaning up expired links: {str(e)}")
            if conn:
                conn.rollback()
            return 0
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def process_shared_link(token, current_user):
        """Process a shared project link access
        
        Args:
            token: The share token
            current_user: The current user session data
            
        Returns:
            tuple: (project_data, status_message)
        """
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # First try to extract project_id from token without full validation
            project_id = None
            share_link_id = None
            
            try:
                project_id = TokenService.extract_project_id_from_token(token)
                if project_id:
                    cursor.execute("""
                        SELECT id FROM project_share_links
                        WHERE project_id = %s AND is_revoked = FALSE
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (project_id,))
                    share_link_result = cursor.fetchone()
                    if share_link_result:
                        share_link_id = share_link_result[0]
            except Exception as e:
                logger.warning(f"Could not extract project_id from token: {str(e)}")
            
            # Now validate the token format and get verified project_id
            project_id, token_error = TokenService.validate_share_token(token)
            
            if token_error:
                # Log invalid token access attempt
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id,  # Use the previously found share_link_id
                    current_user['ms_object_id'] if current_user else None, 
                    False, 
                    f"Invalid token: {token_error}"
                )
                return None, token_error
            
            # Find the share link in database
            cursor.execute("""
                SELECT id, project_id, expires_at, is_revoked, access_count, access_type
                FROM project_share_links
                WHERE project_id = %s AND is_revoked = FALSE
                ORDER BY created_at DESC
                LIMIT 1
            """, (project_id,))
            
            share_link_data = cursor.fetchone()
            if not share_link_data:
                # Log share link not found
                AccessService.log_access_attempt(
                    conn, 
                    None, 
                    current_user['ms_object_id'] if current_user else None, 
                    False, 
                    "Share link not found or revoked"
                )
                return None, "Invalid or expired share link"
            
            share_link_id, project_id, expires_at, is_revoked, access_count, access_type = share_link_data
            
            # Check for rate limiting
            is_limited, limit_message = AccessService.is_rate_limited(
                conn, 
                share_link_id, 
                AccessService.get_user_id_from_ms_object_id(conn, current_user['ms_object_id']) if current_user else None,
                AccessService.get_client_ip()
            )
            
            if is_limited:
                return None, limit_message
            
            # Check if the link is still valid
            if is_revoked:
                # Log revoked link access attempt
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'] if current_user else None, 
                    False, 
                    "Link has been revoked"
                )
                return None, "This share link has been revoked"
                
            if datetime.utcnow() > expires_at:
                # Log expired link access attempt
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'] if current_user else None, 
                    False, 
                    "Link has expired"
                )
                return None, "This share link has expired"
            
            # Get the project
            cursor.execute("""
                SELECT id, name
                FROM projects
                WHERE id = %s
            """, (project_id,))
            
            project_data = cursor.fetchone()
            if not project_data:
                # Log project not found
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'] if current_user else None, 
                    False, 
                    "Project no longer exists"
                )
                return None, "Project no longer exists"
                
            project_id, project_name = project_data
            
            # Verify user is authenticated
            if not current_user:
                # Not an error - just need to authenticate
                return {"id": project_id, "name": project_name}, "authentication_required"
            
            # Verify user belongs to the same organization
            # This check verifies if the user has access to any projects in the system
            cursor.execute("""
                SELECT 1 FROM project_access
                WHERE subject_type = %s AND subject_id = %s
                LIMIT 1
            """, (SubjectTypeEnum.user.value, current_user['ms_object_id']))
            
            if not cursor.fetchone():
                # Log organization mismatch
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'], 
                    False, 
                    "User not authorized in the system"
                )
                return None, "You don't have permission to access this project"
            
            # Check if user already has access
            cursor.execute("""
                SELECT access_type FROM project_access
                WHERE project_id = %s AND subject_type = %s AND subject_id = %s
            """, (project_id, SubjectTypeEnum.user.value, current_user['ms_object_id']))
            
            existing_access = cursor.fetchone()
            
            # Update share link access tracking
            cursor.execute("""
                UPDATE project_share_links
                SET last_accessed_at = %s, access_count = %s
                WHERE id = %s
            """, (datetime.utcnow(), (access_count or 0) + 1, share_link_id))
            
            # If no existing access, grant co-owner access
            if not existing_access:
                cursor.execute("""
                    INSERT INTO project_access
                    (project_id, subject_type, subject_id, access_type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    project_id, 
                    SubjectTypeEnum.user.value, 
                    current_user['ms_object_id'], 
                    access_type,
                    datetime.utcnow()
                ))
                
                # Log successful access grant
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'], 
                    True, 
                    f"Access granted as {access_type}"
                )
                
                conn.commit()
                return {"id": project_id, "name": project_name}, "access_granted"
            else:
                # Log access for existing user
                existing_access_type = existing_access[0]
                AccessService.log_access_attempt(
                    conn, 
                    share_link_id, 
                    current_user['ms_object_id'], 
                    True, 
                    f"User already has {existing_access_type} access"
                )
                
                conn.commit()
                return {"id": project_id, "name": project_name}, "already_has_access"
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error processing shared link: {str(e)}")
            return None, f"Error: {type(e).__name__}"
        finally:
            # Connection will be closed by middleware
            pass
    
    @staticmethod
    def get_project_co_owners(project_id, user_id):
        """Get list of co-owners and readers for a project
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            
        Returns:
            tuple: (co_owners_data, error_message)
        """
        conn = None
        try:
            logger.debug(f"Getting co-owners for project {project_id}, user {user_id}")
            conn = get_db()
            cursor = conn.cursor()
            
            # Check if user has permission to view co-owners (must be owner or admin)
            try:
                has_permission, _ = AccessService.check_user_project_permission(
                    conn,
                    project_id,
                    user_id,
                    [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
                )
                
                if not has_permission:
                    return None, "You don't have permission to view this information"
            except Exception as permission_error:
                logger.error(f"Permission check error: {str(permission_error)}")
                # Continue with the assumption that the user has permission
                # This allows viewing the share links even if there's a permission check error
            
            # Get all co-owners
            co_owners = []
            readers = []
            try:
                cursor.execute("""
                    SELECT u.id, u.display_id, pa.created_at, pa.access_type
                    FROM project_access pa
                    JOIN users u ON pa.subject_id = u.ms_object_id
                    WHERE pa.project_id = %s 
                    AND pa.access_type IN (%s, %s) 
                    AND pa.subject_type = %s
                """, (project_id, AccessTypeEnum.co_owner.value, AccessTypeEnum.reader.value, SubjectTypeEnum.user.value))
                
                user_access_data = cursor.fetchall()
                
                for data in user_access_data:
                    user_info = {
                        'user_id': data[0],
                        'display_id': data[1] or 'Unknown User',
                        'access_granted_at': data[2]  # Keep as datetime object for template
                    }
                    
                    if data[3] == AccessTypeEnum.co_owner.value:
                        co_owners.append(user_info)
                    elif data[3] == AccessTypeEnum.reader.value:
                        readers.append(user_info)
            except Exception as user_error:
                logger.error(f"Error getting user access data: {str(user_error)}")
                # Continue with empty co-owners and readers lists
            
            # Get all active share links info
            share_links = []
            try:
                cursor.execute("""
                    SELECT id, created_at, expires_at, access_count, last_accessed_at, is_revoked, access_type
                    FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE
                    ORDER BY created_at DESC
                """, (project_id,))
                
                share_links_data = cursor.fetchall()
                
                for link_data in share_links_data:
                    link_id, created_at, expires_at, access_count, last_accessed_at, is_revoked, access_type = link_data
                    
                    # Get analytics data for each share link
                    analytics_data = None
                    try:
                        cursor.execute("""
                            SELECT COUNT(*) FILTER (WHERE access_granted = TRUE) as successful,
                                   COUNT(*) FILTER (WHERE access_granted = FALSE) as failed
                            FROM project_share_access_logs
                            WHERE share_link_id = %s
                        """, (link_id,))
                        
                        analytics_data = cursor.fetchone()
                    except Exception as analytics_error:
                        logger.error(f"Error getting analytics data: {str(analytics_error)}")
                    
                    successful_accesses, failed_accesses = analytics_data if analytics_data else (0, 0)
                    
                    # Get recent access attempts for each link
                    recent_access = []
                    try:
                        cursor.execute("""
                            SELECT access_granted, accessed_at, client_ip, user_agent, notes
                            FROM project_share_access_logs
                            WHERE share_link_id = %s
                            ORDER BY accessed_at DESC
                            LIMIT 10
                        """, (link_id,))
                        
                        recent_access = [{
                            'access_granted': row[0],
                            'time': row[1],
                            'client_ip': row[2],
                            'user_agent': row[3],
                            'message': row[4]
                        } for row in cursor.fetchall()]
                    except Exception as access_error:
                        logger.error(f"Error getting recent access data: {str(access_error)}")
                    
                    share_links.append({
                        'id': link_id,
                        'created_at': created_at,
                        'expires_at': expires_at,
                        'access_count': access_count or 0,
                        'last_accessed_at': last_accessed_at,
                        'is_revoked': is_revoked,
                        'is_active': not is_revoked and (expires_at is None or expires_at > datetime.utcnow()),
                        'access_type': access_type,
                        'analytics': {
                            'successful_accesses': successful_accesses,
                            'failed_accesses': failed_accesses,
                            'recent_access': recent_access
                        }
                    })
            except Exception as link_error:
                logger.error(f"Error getting share links data: {str(link_error)}")
                # Continue with empty share_links list
            
            share_info = {
                'share_links': share_links,
                'co_owners': co_owners,
                'readers': readers,
                'total_co_owners': len(co_owners),
                'total_readers': len(readers)
            }
            
            return share_info, None
            
        except Exception as e:
            logger.error(f"Error getting project co-owners: {str(e)}")
            # Return an empty but valid structure to prevent template errors
            return {
                'share_links': [],
                'co_owners': [],
                'readers': [],
                'total_co_owners': 0,
                'total_readers': 0
            }, f"Error: {type(e).__name__}: {str(e)}"
        finally:

            pass
    
    @staticmethod
    def get_token_for_link(project_id, user_id, access_type, link_id=None):
        """Get token for an existing share link
        
        Args:
            project_id: The project ID
            user_id: The user's MS object ID
            access_type: The type of link to get the token for
            link_id: Optional specific link ID to retrieve token for
            
        Returns:
            tuple: (token, error_message)
        """
        conn = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            
            # Check if user has permission to view share links (must be owner or admin)
            has_permission, _ = AccessService.check_user_project_permission(
                conn,
                project_id,
                user_id,
                [AccessTypeEnum.admin.value, AccessTypeEnum.owner.value]
            )
            
            if not has_permission:
                return None, "You don't have permission to view this information"
            
            # Get the active share link - either by specific ID or the most recent one
            if link_id:
                cursor.execute("""
                    SELECT encrypted_token FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE AND access_type = %s AND id = %s
                """, (project_id, access_type, link_id))
            else:
                cursor.execute("""
                    SELECT encrypted_token FROM project_share_links
                    WHERE project_id = %s AND is_revoked = FALSE AND access_type = %s
                    ORDER BY created_at DESC LIMIT 1
                """, (project_id, access_type))
            
            result = cursor.fetchone()
            if not result:
                return None, "No active share link found for this access type"
            
            encrypted_token = result[0]
            
            # Decrypt the token
            token = TokenService.decrypt_token(encrypted_token)
            if not token:
                return None, "Could not decrypt share token"
            
            return token, None
            
        except Exception as e:
            logger.error(f"Error getting token for link: {str(e)}")
            return None, f"Error: {type(e).__name__}"
        finally:
            pass