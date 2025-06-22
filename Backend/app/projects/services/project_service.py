"""Project Service Module

This module contains business logic for project operations.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from app.core.database import get_db_cursor
from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError
)
from app.core.logging import get_logger
from app.projects.models.project import Project
import json

logger = get_logger(__name__)

class ProjectService:
    """Service class for project operations."""
    
    @staticmethod
    def get_projects(
        user_id: str,
        page: int = 1,
        per_page: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Project], Dict[str, Any]]:
        """Get all projects accessible by a user with pagination.
        
        Args:
            user_id: User's ms_object_id
            page: Page number (1-based)
            per_page: Items per page
            status: Optional status filter
            search: Optional search term for project name/description
            
        Returns:
            tuple: (List of Project instances, Pagination metadata)
            
        Raises:
            ProjectValidationError: If parameters are invalid
            ProjectAccessDeniedError: If user access is invalid
        """
        # Security: Validate user_id format
        if not user_id:
            raise ProjectValidationError("User ID is required")
            
        # Convert user_id to string if it's not already
        user_id = str(user_id).strip()
        if not user_id:
            raise ProjectValidationError("Invalid user ID")
            
        # Security: Sanitize pagination parameters
        try:
            page = max(1, int(page))
            per_page = min(max(1, int(per_page)), 100)
        except (TypeError, ValueError):
            raise ProjectValidationError("Invalid pagination parameters")
        
        with get_db_cursor() as cursor:
            # Security: Verify user exists and is active
            cursor.execute('''
                SELECT EXISTS(
                    SELECT 1 FROM users 
                    WHERE ms_object_id = %s 
                )
            ''', (user_id,))
            if not cursor.fetchone()[0]:
                raise ProjectAccessDeniedError("User not found or inactive")
            
            # Build base query
            count_query = '''
                SELECT COUNT(DISTINCT p.id)
                FROM projects p
                JOIN project_access pa ON p.id = pa.project_id
                WHERE pa.subject_type = 'user'
                AND pa.subject_id = %s
                AND p.status != 'Deleted'
            '''
            
            detail_query = '''
                SELECT 
                    p.*,
                    pa.access_type,
                    u.ms_object_id as owner_ms_object_id
                FROM projects p
                JOIN project_access pa ON p.id = pa.project_id
                LEFT JOIN users u ON p.owner_user_id = u.id
                WHERE pa.subject_type = 'user'
                AND pa.subject_id = %s
                AND p.status != 'Deleted'
            '''
            
            params = [user_id]
            
            # Add status filter if provided
            if status:
                count_query += ' AND p.status = %s'
                detail_query += ' AND p.status = %s'
                params.append(status)
            
            # Add search filter if provided
            if search:
                search_term = f"%{search}%"
                count_query += ' AND (p.name ILIKE %s OR p.description ILIKE %s)'
                detail_query += ' AND (p.name ILIKE %s OR p.description ILIKE %s)'
                params.extend([search_term, search_term])
            
            # Add security check
            count_query += '''
                AND EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.ms_object_id = pa.subject_id 
                )
            '''
            
            detail_query += '''
                AND EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.ms_object_id = pa.subject_id 
                )
                ORDER BY p.updated_at DESC
                LIMIT %s OFFSET %s
            '''
            
            # Get total count
            cursor.execute(count_query, params)
            total_items = cursor.fetchone()[0]
            
            # Calculate pagination metadata
            total_pages = (total_items + per_page - 1) // per_page
            has_next = page < total_pages
            has_prev = page > 1
            
            # Get paginated results
            cursor.execute(detail_query, params + [per_page, (page - 1) * per_page])
            
            # Security: Validate and sanitize database results
            projects = []
            for row in cursor.fetchall():
                try:
                    project_dict = dict(row)
                    # Map owner_ms_object_id to owner_user_id for the Project model
                    if 'owner_ms_object_id' in project_dict:
                        project_dict['owner_user_id'] = project_dict.pop('owner_ms_object_id')
                    # Validate required fields
                    if not all(k in project_dict for k in ['id', 'name', 'status', 'owner_user_id']):
                        logger.error(f"Invalid project data: {project_dict}")
                        continue
                    projects.append(Project.from_db_dict(project_dict))
                except Exception as e:
                    logger.error(f"Error processing project data: {e}")
                    continue
            
            # Prepare pagination metadata
            metadata = {
                'total_items': total_items,
                'total_pages': total_pages,
                'current_page': page,
                'per_page': per_page,
                'has_next': has_next,
                'has_prev': has_prev,
                'next_page': page + 1 if has_next else None,
                'prev_page': page - 1 if has_prev else None
            }
            
            return projects, metadata
    
    @staticmethod
    def get_project(project_id: int, user_id: str) -> Project:
        """Get a specific project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            Project: Project instance
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        try:
            # First verify the user exists
            with get_db_cursor() as cursor:
                cursor.execute('''
                    SELECT id FROM users WHERE ms_object_id = %s::uuid
                ''', (user_id,))
                user_result = cursor.fetchone()
                if not user_result:
                    logger.error(f"User not found with ms_object_id: {user_id}")
                    raise ProjectAccessDeniedError("User not found")

                # Now get the project
                cursor.execute('''
                    SELECT p.*, pa.access_type
                    FROM projects p
                    JOIN project_access pa ON p.id = pa.project_id
                    WHERE p.id = %s
                    AND pa.subject_type = 'user'
                    AND pa.subject_id = %s::uuid
                ''', (project_id, user_id))
                
                project = cursor.fetchone()
                if not project:
                    raise ProjectNotFoundError()
                
                project_dict = dict(project)
                project_obj = Project.from_db_dict(project_dict)
                return project_obj
                
        except Exception as e:
            logger.error(f"Detailed error in get_project: {type(e).__name__}: {str(e)}")
            logger.error(f"Project ID: {project_id}, User ID: {user_id}")
            if hasattr(e, '__traceback__'):
                import traceback
                logger.error(f"Traceback: {''.join(traceback.format_tb(e.__traceback__))}")
            raise
    
    @staticmethod
    def create_project(name: str, description: str, owner_id: str) -> Project:
        """Create a new project.
        
        Args:
            name: Project name
            description: Project description
            owner_id: Owner's ms_object_id
            
        Returns:
            Project: Created project instance
        """
        with get_db_cursor(commit=True) as cursor:
            # First get the user's ID from ms_object_id
            cursor.execute('''
                SELECT id FROM users WHERE ms_object_id = %s
            ''', (owner_id,))
            user_row = cursor.fetchone()
            if not user_row:
                raise ProjectValidationError("Invalid owner ID")
            
            user_id = user_row['id']
            
            # Create project with owner_user_id
            cursor.execute('''
                INSERT INTO projects (name, description, status, owner_user_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, NOW(), NOW())
                RETURNING *
            ''', (name, description, 'In Draft', user_id))
            
            project = dict(cursor.fetchone())
            
            # Add owner access
            cursor.execute('''
                INSERT INTO project_access (project_id, subject_type, subject_id, access_type)
                VALUES (%s, 'user', %s, 'owner')
            ''', (project['id'], owner_id))
            
            project['access_type'] = 'owner'
            project_obj = Project.from_db_dict(project)
            
            return project_obj
    
    @staticmethod
    def update_project(project_id: int, user_id: str, **updates) -> Project:
        """Update a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            **updates: Fields to update
            
        Returns:
            Project: Updated project instance
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        # Get current project to check access
        project = ProjectService.get_project(project_id, user_id)
        if not project.can_edit(project.access_type):
            raise ProjectAccessDeniedError("You don't have permission to edit this project")
        
        with get_db_cursor(commit=True) as cursor:
            # Build update query
            update_fields = []
            params = []
            for key, value in updates.items():
                if key in ['name', 'description']:
                    update_fields.append(f"{key} = %s")
                    params.append(value)
            
            if not update_fields:
                return project
            
            # Add updated_at and project_id
            update_fields.append("updated_at = NOW()")
            params.append(project_id)
            
            # Update project
            cursor.execute(f'''
                UPDATE projects 
                SET {", ".join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', params)
            
            updated = dict(cursor.fetchone())
            updated['access_type'] = project.access_type
            project_obj = Project.from_db_dict(updated)
            
            return project_obj
    
    @staticmethod
    def delete_project(project_id: int, user_id: str) -> None:
        """Delete a project (soft delete).
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
        """
        # Get current project to check access
        project = ProjectService.get_project(project_id, user_id)
        if project.access_type != 'owner':
            raise ProjectAccessDeniedError("Only project owners can delete projects")
        
        with get_db_cursor(commit=True) as cursor:
            cursor.execute('''
                UPDATE projects 
                SET status = 'Deleted', updated_at = NOW()
                WHERE id = %s
            ''', (project_id,))
    
    @staticmethod
    def update_project_status(project_id: int, user_id: str, new_status: str) -> Project:
        """Update a project's status.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            new_status: New status value
            
        Returns:
            Project: Updated project instance
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
            ProjectAccessDeniedError: If user lacks access
            ProjectValidationError: If status transition is invalid
        """
        # Get current project to check access and validate transition
        project = ProjectService.get_project(project_id, user_id)
        if not project.can_edit(project.access_type):
            raise ProjectAccessDeniedError("You don't have permission to change project status")
        
        with get_db_cursor(commit=True) as cursor:
            cursor.execute('''
                UPDATE projects 
                SET status = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            ''', (new_status, project_id))
            
            updated = dict(cursor.fetchone())
            updated['access_type'] = project.access_type
            project_obj = Project.from_db_dict(updated)
            
            return project_obj

    @staticmethod
    def get_project_data(project_id: int, report_id: int) -> Dict[str, Any]:
        """Get project data including tables info and selected data.
        
        Args:
            project_id: Project ID
            report_id: Report ID
            
        Returns:
            dict: Project data including tables_info and selected_data
            
        Raises:
            ProjectNotFoundError: If project doesn't exist
        """
        try:
            with get_db_cursor() as cursor:
                # Get project data from project_data table
                cursor.execute('''
                    SELECT pd.tables_info, pd.selected_data, pd.report_url, pd.synonyms, pd.value_rules
                    FROM project_data pd
                    WHERE pd.project_id = %s AND pd.report_id = %s
                ''', (project_id, report_id))
                
                result = cursor.fetchone()
                if result:
                    # Parse JSON fields
                    try:
                        tables_info = json.loads(result['tables_info']) if result['tables_info'] else {}
                        selected_data = json.loads(result['selected_data']) if result['selected_data'] else {}
                        synonyms = json.loads(result['synonyms']) if result['synonyms'] else {}
                        value_rules = json.loads(result['value_rules']) if result['value_rules'] else {}
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing JSON from database: {str(e)}")
                        tables_info = {}
                        selected_data = {}
                        synonyms = {}
                        value_rules = {}

                    return {
                        'tables_info': tables_info,
                        'selected_data': selected_data,
                        'synonyms': synonyms,
                        'value_rules': value_rules,
                        'report_url': result['report_url']
                    }
                return {
                    'tables_info': {},
                    'selected_data': {},
                    'synonyms': {},
                    'value_rules': {},
                    'report_url': None
                }
                
        except Exception as e:
            logger.error(f"Error getting project data: {str(e)}")
            raise ProjectNotFoundError("Failed to get project data")

    @staticmethod
    def save_project_data(
        project_id: int,
        report_id: Optional[int] = None,
        tables_info: Optional[Dict[str, Any]] = None,
        selected_data: Optional[Dict[str, Any]] = None,
        synonyms: Optional[Dict[str, Any]] = None,
        report_url: Optional[str] = None,
        value_rules: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Optional[int]]:
        """Save project data to the database.
        
        Args:
            project_id: Project ID
            report_id: Optional report ID
            tables_info: Optional dictionary containing tables information
            selected_data: Optional dictionary containing selected data
            synonyms: Optional dictionary containing synonyms
            report_url: Optional report URL
            value_rules: Optional dictionary containing value rules
            
        Returns:
            tuple: (Success status, Report ID used)
            
        Raises:
            ProjectNotFoundError: If project doesn't exist or is deleted
        """
        try:
            current_time = datetime.now(timezone.utc)
            with get_db_cursor(commit=True) as cursor:
                # Update the project's updated_at timestamp
                cursor.execute(
                    'UPDATE projects SET updated_at = %s WHERE id = %s',
                    (current_time, project_id)
                )

                # Validate or create report_id
                valid_report_id = report_id
                if not valid_report_id:
                    # Try to find default report
                    cursor.execute(
                        'SELECT id FROM reports WHERE project_id = %s AND default_report = TRUE',
                        (project_id,)
                    )
                    default_report = cursor.fetchone()
                    if default_report:
                        valid_report_id = default_report[0]
                    else:
                        # Try to get any report
                        cursor.execute(
                            'SELECT id FROM reports WHERE project_id = %s LIMIT 1',
                            (project_id,)
                        )
                        any_report = cursor.fetchone()
                        if any_report:
                            valid_report_id = any_report[0]
                        else:
                            # Create default report
                            cursor.execute('''
                                INSERT INTO reports 
                                (project_id, name, description, default_report, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s)
                                RETURNING id
                            ''', (project_id, 'Default Report', 'Default report for project', True, 
                                 current_time, current_time))
                            valid_report_id = cursor.fetchone()[0]

                # Check if project_data entry exists
                cursor.execute(
                    'SELECT 1 FROM project_data WHERE project_id = %s AND report_id = %s',
                    (project_id, valid_report_id)
                )
                exists = cursor.fetchone() is not None

                # Prepare JSON data
                tables_info_json = json.dumps(tables_info) if tables_info is not None else None
                selected_data_json = json.dumps(selected_data) if selected_data is not None else None
                synonyms_json = json.dumps(synonyms) if synonyms is not None else None
                value_rules_json = json.dumps(value_rules) if value_rules is not None else None

                if exists:
                    # Update existing entry
                    update_fields = []
                    params = []
                    if tables_info is not None:
                        update_fields.append('tables_info = %s')
                        params.append(tables_info_json)
                    if selected_data is not None:
                        update_fields.append('selected_data = %s')
                        params.append(selected_data_json)
                    if synonyms is not None:
                        update_fields.append('synonyms = %s')
                        params.append(synonyms_json)
                    if report_url is not None:
                        update_fields.append('report_url = %s')
                        params.append(report_url)
                    if value_rules is not None:
                        update_fields.append('value_rules = %s')
                        params.append(value_rules_json)

                    if update_fields:
                        query = f'''
                            UPDATE project_data 
                            SET {', '.join(update_fields)} 
                            WHERE project_id = %s AND report_id = %s
                        '''
                        params.extend([project_id, valid_report_id])
                        cursor.execute(query, params)
                else:
                    # Insert new entry
                    cursor.execute('''
                        INSERT INTO project_data 
                        (project_id, report_id, tables_info, selected_data, synonyms, report_url, value_rules)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ''', (project_id, valid_report_id, tables_info_json, selected_data_json, 
                          synonyms_json, report_url, value_rules_json))

                return True, valid_report_id

        except Exception as e:
            logger.error(f"Error saving project data: {str(e)}")
            raise ProjectNotFoundError("Failed to save project data")

    @staticmethod
    def delete_table_from_project_data(project_id: int, report_id: int, table_name: str) -> bool:
        """Delete a specific table from project data.
        
        Removes the specified table from tables_info, selected_data, and synonyms.
        
        Args:
            project_id: Project ID
            report_id: Report ID
            table_name: Name of the table to delete
            
        Returns:
            bool: True if successful, False otherwise
            
        Raises:
            ProjectNotFoundError: If project data doesn't exist
        """
        try:
            # Get existing project data
            existing_data = ProjectService.get_project_data(project_id, report_id)
            
            if not existing_data:
                raise ProjectNotFoundError("Project data not found")
            
            # Remove table from tables_info if it exists
            tables_info = existing_data.get('tables_info') or {}
            if isinstance(tables_info, dict) and table_name in tables_info:
                del tables_info[table_name]
            
            # Remove table from selected_data if it exists
            selected_data = existing_data.get('selected_data') or {}
            if isinstance(selected_data, dict) and table_name in selected_data:
                del selected_data[table_name]
            
            # Remove table from synonyms if it exists
            synonyms = existing_data.get('synonyms') or {}
            if isinstance(synonyms, dict) and table_name in synonyms:
                del synonyms[table_name]
            
            # Save updated data
            success, _ = ProjectService.save_project_data(
                project_id,
                report_id,
                tables_info=tables_info,
                selected_data=selected_data,
                synonyms=synonyms,
                report_url=existing_data.get('report_url'),
                value_rules=existing_data.get('value_rules')
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting table from project data: {str(e)}")
            return False

    @staticmethod
    def get_user_access_type(project_id: int, user_id: str) -> Optional[str]:
        """Get a user's access type for a project.
        
        Args:
            project_id: Project ID
            user_id: User's ms_object_id
            
        Returns:
            Optional[str]: The user's access type ('owner', 'co_owner', 'editor', 'viewer') or None if no access
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute('''
                    SELECT access_type 
                    FROM project_access 
                    WHERE project_id = %s 
                    AND subject_type = 'user'
                    AND subject_id = %s
                ''', (project_id, user_id))
                
                result = cursor.fetchone()
                return result['access_type'] if result else None
                
        except Exception as e:
            logger.error(f"Error getting user access type: {str(e)}")
            return None