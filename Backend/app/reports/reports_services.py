"""Reports Services Module

This module contains business logic related to report management functionality.
It was extracted from the original routes.py as part of the application restructuring.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging
from app.core.database import get_db_cursor
from app.core.exceptions import (
    ReportNotFoundError,
    ReportValidationError,
    ProjectAccessDeniedError
)
from app.models.report import Report
from app.projects.services.project_service import ProjectService
from flask import g

logger = logging.getLogger(__name__)

class ReportService:
    """Service class for report operations."""
    
    @staticmethod
    def get_all_reports_for_project(project_id: int) -> List[Dict[str, Any]]:
        """Get all reports for a project, excluding deleted reports.
        
        Args:
            project_id: Project ID
            
        Returns:
            List of report dictionaries
            
        Raises:
            ReportValidationError: If project_id is invalid
        """
        if not project_id:
            raise ReportValidationError("Project ID is required")
            
        with get_db_cursor() as cursor:
            cursor.execute(
                'SELECT * FROM reports WHERE project_id = %s AND status != %s ORDER BY name ASC', 
                (project_id, 'Deleted')
            )
            reports = [dict(row) for row in cursor.fetchall()]
            return reports

    @staticmethod
    def create_report(
        project_id: int, 
        report_name: str, 
        description: Optional[str] = None, 
        default_report: bool = False
    ) -> Optional[int]:
        """Create a new report for a project.
        
        Args:
            project_id: The ID of the project
            report_name: The name of the report
            description: The description of the report
            default_report: Whether this is the default report for the project
            
        Returns:
            The ID of the created report, or None if creation failed
            
        Raises:
            ReportValidationError: If required parameters are invalid
        """
        if not project_id or not report_name:
            raise ReportValidationError("Project ID and report name are required")
            
        with get_db_cursor(commit=True) as cursor:
            try:
                # Update the project's updated_at timestamp
                cursor.execute(
                    'UPDATE projects SET updated_at = %s WHERE id = %s',
                    (datetime.now(timezone.utc), project_id)
                )
                
                # If this is set as default, unset any existing default reports for this project
                if default_report:
                    cursor.execute('UPDATE reports SET default_report = FALSE WHERE project_id = %s', (project_id,))
                
                # Create the report with default status "In Draft"
                cursor.execute(
                    'INSERT INTO reports (project_id, name, description, default_report, status, created_at, updated_at) '
                    'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id',
                    (project_id, report_name, description, default_report, 'In Draft', 
                     datetime.now(timezone.utc), datetime.now(timezone.utc))
                )
                report_id = cursor.fetchone()[0]
                return report_id
            except Exception as e:
                logger.error(f"Error creating report: {e}")
                return None

    @staticmethod
    def edit_report(
        report_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        default_report: Optional[bool] = None,
        status: Optional[str] = None
    ) -> bool:
        """Edit a report's details.
        
        Args:
            report_id: The ID of the report to edit
            name: The new name for the report
            description: The new description for the report
            default_report: Whether this is the default report for the project
            status: The new status for the report ('Live' or 'In Draft')
            
        Returns:
            bool: True if editing was successful, False otherwise
            
        Raises:
            ReportNotFoundError: If report doesn't exist
            ReportValidationError: If status value is invalid
        """
        if status and status not in ['Live', 'In Draft']:
            raise ReportValidationError("Invalid status value")
            
        with get_db_cursor(commit=True) as cursor:
            try:
                # Get the project_id for this report
                cursor.execute('SELECT project_id FROM reports WHERE id = %s', (report_id,))
                result = cursor.fetchone()
                if not result:
                    logger.warning(f"Report not found. Report ID: {report_id}")
                    raise ReportNotFoundError("Report not found")
                
                project_id = result[0]
                
                # Update the project's updated_at timestamp
                cursor.execute(
                    'UPDATE projects SET updated_at = %s WHERE id = %s',
                    (datetime.now(timezone.utc), project_id)
                )
                
                # If this is set as default, unset any existing default reports for this project
                if default_report:
                    cursor.execute('UPDATE reports SET default_report = FALSE WHERE project_id = %s', (project_id,))
                
                # Update the report
                update_fields = []
                params = []
                
                if name is not None:
                    update_fields.append('name = %s')
                    params.append(name)
                
                if description is not None:
                    update_fields.append('description = %s')
                    params.append(description)
                
                if default_report is not None:
                    update_fields.append('default_report = %s')
                    params.append(default_report)
                    
                if status is not None:
                    update_fields.append('status = %s')
                    params.append(status)
                
                update_fields.append('updated_at = %s')
                params.append(datetime.now(timezone.utc))
                
                if update_fields:
                    query = f"UPDATE reports SET {', '.join(update_fields)} WHERE id = %s"
                    params.append(report_id)
                    cursor.execute(query, params)
                    logger.info(f"Successfully updated report {report_id}")
                
                return True
            except ReportNotFoundError:
                raise
            except Exception as e:
                logger.error(f"Error editing report {report_id}: {str(e)}")
                return False

    @staticmethod
    def delete_report(report_id: int, project_id: int) -> Tuple[bool, Optional[str]]:
        """Soft delete a report by setting its status to 'Deleted' and updating timestamps.
        
        Args:
            report_id: The ID of the report to delete
            project_id: The ID of the project to verify ownership
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            ReportValidationError: If parameters are invalid
        """
        if not report_id or not project_id:
            raise ReportValidationError("Both Report ID and Project ID are required")
        
        with get_db_cursor(commit=True) as cursor:
            try:
                # First verify the report exists and belongs to the project
                cursor.execute('SELECT id FROM reports WHERE id = %s AND project_id = %s', (report_id, project_id))
                result = cursor.fetchone()
                if not result:
                    logger.warning(f"Report not found or does not belong to project. Report ID: {report_id}, Project ID: {project_id}")
                    return False, 'Report not found or does not belong to this project'
                
                # Update the project's updated_at timestamp
                cursor.execute(
                    'UPDATE projects SET updated_at = %s WHERE id = %s',
                    (datetime.now(timezone.utc), project_id)
                )
                
                # Soft delete the report
                cursor.execute(
                    'UPDATE reports SET status = %s, updated_at = %s WHERE id = %s',
                    ('Deleted', datetime.now(timezone.utc), report_id)
                )
                
                logger.info(f"Successfully deleted report {report_id} from project {project_id}")
                return True, None
            except Exception as e:
                logger.error(f"Error deleting report {report_id} from project {project_id}: {str(e)}")
                return False, f"Failed to delete report: {str(e)}"

    @staticmethod
    def get_report_by_id(report_id: int, project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get a report by its ID
        
        Args:
            report_id: The ID of the report to retrieve
            project_id: The ID of the project to verify ownership
            
        Returns:
            Report information or None if not found
            
        Raises:
            ReportValidationError: If report_id is invalid
        """
        if not report_id:
            raise ReportValidationError("Report ID is required")
            
        with get_db_cursor() as cursor:
            try:
                if project_id:
                    cursor.execute('SELECT * FROM reports WHERE id = %s AND project_id = %s', (report_id, project_id))
                else:
                    cursor.execute('SELECT * FROM reports WHERE id = %s', (report_id,))
                report = cursor.fetchone()
                return dict(report) if report else None
            except Exception as e:
                logger.error(f"Error fetching report: {str(e)}")
                return None

    @staticmethod
    def copy_report(
        project_id: int,
        source_report_id: int,
        new_name: str,
        new_description: Optional[str] = None,
        target_project_id: Optional[int] = None
    ) -> Optional[int]:
        """Create a copy of an existing report with a new name and description.
        
        Args:
            project_id: The ID of the source project
            source_report_id: The ID of the report to copy
            new_name: The name for the new report
            new_description: The description for the new report (optional)
            target_project_id: The ID of the project to copy to (optional, defaults to source project)
            
        Returns:
            The ID of the created report copy, or None if creation failed
            
        Raises:
            ReportValidationError: If required parameters are invalid
            ReportNotFoundError: If source report doesn't exist
        """
        if not project_id or not source_report_id or not new_name:
            raise ReportValidationError("Project ID, source report ID, and new name are required")
        
        # If target_project_id is not specified, use the source project_id
        target_project_id = target_project_id or project_id
        
        with get_db_cursor(commit=True) as cursor:
            try:
                # First verify the source report exists and belongs to the project
                cursor.execute(
                    'SELECT * FROM reports WHERE id = %s AND project_id = %s',
                    (source_report_id, project_id)
                )
                source_report = cursor.fetchone()
                if not source_report:
                    raise ReportNotFoundError("Source report not found or does not belong to this project")

                # Create the new report with status "In Draft"
                cursor.execute(
                    'INSERT INTO reports (project_id, name, description, default_report, status, created_at, updated_at) '
                    'VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id',
                    (target_project_id, new_name, new_description, False, 'In Draft', 
                     datetime.now(timezone.utc), datetime.now(timezone.utc))
                )
                new_report_id = cursor.fetchone()[0]

                # Copy project data from source report to new report
                cursor.execute(
                    'INSERT INTO project_data (project_id, report_id, tables_info, selected_data, synonyms, report_url, value_rules) '
                    'SELECT %s, %s, tables_info, selected_data, synonyms, report_url, value_rules '
                    'FROM project_data WHERE project_id = %s AND report_id = %s',
                    (target_project_id, new_report_id, project_id, source_report_id)
                )

                # Copy report pages from source report to new report
                cursor.execute(
                    'INSERT INTO report_pages (project_id, report_id, page_name, page_description, page_url, created_at) '
                    'SELECT %s, %s, page_name, page_description, page_url, %s '
                    'FROM report_pages WHERE project_id = %s AND report_id = %s',
                    (target_project_id, new_report_id, datetime.now(timezone.utc), project_id, source_report_id)
                )

                return new_report_id
            except Exception as e:
                logger.error(f"Error copying report: {str(e)}")
                return None