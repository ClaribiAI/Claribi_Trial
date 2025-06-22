"""Report Pages Services Module

This module contains business logic related to report pages management functionality.
It was extracted from the original routes.py as part of the application restructuring.
"""

from typing import List, Dict, Any, Optional, Tuple
import logging
from app.core.database import get_db_cursor
from .validators import (
    ReportPageNotFoundError,
    ReportPageValidationError
)
from .validators.report_pages_validators import (
    validate_page_url,
    validate_page_name,
    validate_required_ids
)

logger = logging.getLogger(__name__)

class ReportPageService:
    """Service class for report page operations."""
    
    @staticmethod
    def get_report_pages_for_project(project_id: int, report_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all report pages for a specific project and optionally filtered by report_id
        
        Args:
            project_id: The ID of the project
            report_id: Optional ID of the report to filter by
            
        Returns:
            List of report page dictionaries
            
        Raises:
            ReportPageValidationError: If project_id is invalid
        """
        validate_required_ids(project_id=project_id, report_id=report_id, require_all=False)
            
        with get_db_cursor() as cursor:
            try:
                if report_id:
                    cursor.execute(
                        'SELECT * FROM report_pages WHERE project_id = %s AND report_id = %s ORDER BY created_at DESC',
                        (project_id, report_id)
                    )
                else:
                    cursor.execute(
                        'SELECT * FROM report_pages WHERE project_id = %s ORDER BY created_at DESC',
                        (project_id,)
                    )
                pages = [dict(page) for page in cursor.fetchall()]
                return pages
            except Exception as e:
                logger.error(f"Error fetching report pages: {str(e)}")
                return []

    @staticmethod
    def add_report_page(
        project_id: int,
        page_name: str,
        page_url: str,
        report_id: int,
        page_description: str = ''
    ) -> Tuple[bool, int, int, Optional[str]]:
        """Add a new report page
        
        Args:
            project_id: The ID of the project
            page_name: The name of the page
            page_url: The URL of the page
            report_id: The ID of the report
            page_description: Optional description of the page
            
        Returns:
            Tuple of (success, project_id, report_id, error_message)
            
        Raises:
            ReportPageValidationError: If required parameters are invalid
        """
        try:
            validate_required_ids(project_id=project_id, report_id=report_id, require_all=False)
            validate_page_name(page_name)
            validate_page_url(page_url)
                
            with get_db_cursor(commit=True) as cursor:
                # Check if the URL already exists for this project and report
                cursor.execute(
                    'SELECT COUNT(*) FROM report_pages WHERE project_id = %s AND report_id = %s AND page_url = %s',
                    (project_id, report_id, page_url)
                )
                count = cursor.fetchone()[0]
                
                if count > 0:
                    raise ReportPageValidationError(
                        'This Power BI report URL already exists in this report',
                        field='page_url',
                        value=page_url
                    )
                
                cursor.execute(
                    'INSERT INTO report_pages (project_id, report_id, page_name, page_description, page_url) VALUES (%s, %s, %s, %s, %s)',
                    (project_id, report_id, page_name, page_description, page_url)
                )
                logger.info(f"Added new report page '{page_name}' for project {project_id}, report {report_id}")
                return True, project_id, report_id, None
                
        except ReportPageValidationError as e:
            logger.warning(f"Validation error while adding report page: {str(e)}")
            return False, project_id, report_id, str(e)
        except Exception as e:
            logger.error(f"Error adding report page: {str(e)}")
            return False, project_id, report_id, str(e)

    @staticmethod
    def delete_report_page(page_id: int, project_id: int, report_id: int) -> Tuple[bool, Optional[str]]:
        """Delete a report page
        
        Args:
            page_id: The ID of the page to delete
            project_id: The ID of the project
            report_id: The ID of the report
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            ReportPageValidationError: If required parameters are invalid
            ReportPageNotFoundError: If the page is not found
        """
        try:
            validate_required_ids(page_id=page_id, project_id=project_id, report_id=report_id)
                
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    'DELETE FROM report_pages WHERE id = %s AND project_id = %s AND report_id = %s',
                    (page_id, project_id, report_id)
                )
                rows_affected = cursor.rowcount
                
                if rows_affected > 0:
                    logger.info(f"Deleted report page {page_id} from project {project_id}, report {report_id}")
                    return True, None
                else:
                    raise ReportPageNotFoundError(
                        "Report page not found",
                        page_id=page_id,
                        project_id=project_id,
                        report_id=report_id
                    )
                    
        except (ReportPageValidationError, ReportPageNotFoundError) as e:
            logger.warning(str(e))
            return False, str(e)
        except Exception as e:
            logger.error(f"Error deleting report page {page_id}: {str(e)}")
            return False, str(e)

    @staticmethod
    def edit_report_page(
        page_id: int,
        project_id: int,
        report_id: int,
        page_name: str,
        page_url: str,
        page_description: str = ''
    ) -> Tuple[bool, Optional[str]]:
        """Edit a report page
        
        Args:
            page_id: The ID of the page to edit
            project_id: The ID of the project
            report_id: The ID of the report
            page_name: The new name of the page
            page_url: The new URL of the page
            page_description: Optional new description of the page
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            ReportPageValidationError: If required parameters are invalid
            ReportPageNotFoundError: If the page is not found
        """
        try:
            validate_required_ids(page_id=page_id, project_id=project_id, report_id=report_id)
            validate_page_name(page_name)
            validate_page_url(page_url)
                
            with get_db_cursor(commit=True) as cursor:
                # First get the current page to check if URL is actually changing
                cursor.execute(
                    'SELECT page_url FROM report_pages WHERE id = %s AND project_id = %s AND report_id = %s',
                    (page_id, project_id, report_id)
                )
                current_page = cursor.fetchone()
                
                if not current_page:
                    raise ReportPageNotFoundError(
                        "Report page not found",
                        page_id=page_id,
                        project_id=project_id,
                        report_id=report_id
                    )
                
                # Convert Row to dict and get the current URL
                current_url = dict(current_page)['page_url']
                
                # Only check for duplicate URL if we're actually changing the URL
                if current_url != page_url:
                    logger.info(f"URL is changing from {current_url} to {page_url}, checking for duplicates")
                    # Check if the URL already exists for this project and report (excluding the current page)
                    cursor.execute(
                        'SELECT COUNT(*) FROM report_pages WHERE project_id = %s AND report_id = %s AND page_url = %s AND id != %s',
                        (project_id, report_id, page_url, page_id)
                    )
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        raise ReportPageValidationError(
                            'This Power BI report URL already exists in this report',
                            field='page_url',
                            value=page_url
                        )
                else:
                    logger.info(f"URL is not changing, skipping duplicate check")
                
                cursor.execute(
                    'UPDATE report_pages SET page_name = %s, page_description = %s, page_url = %s WHERE id = %s AND project_id = %s AND report_id = %s',
                    (page_name, page_description, page_url, page_id, project_id, report_id)
                )
                
                logger.info(f"Updated report page {page_id} for project {project_id}, report {report_id}")
                return True, None
                    
        except (ReportPageValidationError, ReportPageNotFoundError) as e:
            logger.warning(str(e))
            return False, str(e)
        except Exception as e:
            logger.error(f"Error editing report page {page_id}: {str(e)}")
            return False, str(e)

    @staticmethod
    def get_report_page_by_id(
        page_id: int,
        project_id: Optional[int] = None,
        report_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a report page by its ID
        
        Args:
            page_id: The ID of the page to retrieve
            project_id: Optional ID of the project to verify ownership
            report_id: Optional ID of the report to verify page belongs to
            
        Returns:
            Report page information or None if not found
            
        Raises:
            ReportPageValidationError: If page_id is invalid
            ReportPageNotFoundError: If the page is not found
        """
        try:
            validate_required_ids(page_id=page_id, project_id=project_id, report_id=report_id, require_all=False)
                
            with get_db_cursor() as cursor:
                if project_id and report_id:
                    cursor.execute(
                        'SELECT * FROM report_pages WHERE id = %s AND project_id = %s AND report_id = %s',
                        (page_id, project_id, report_id)
                    )
                elif project_id:
                    cursor.execute(
                        'SELECT * FROM report_pages WHERE id = %s AND project_id = %s',
                        (page_id, project_id)
                    )
                else:
                    cursor.execute(
                        'SELECT * FROM report_pages WHERE id = %s',
                        (page_id,)
                    )
                page = cursor.fetchone()
                if not page:
                    raise ReportPageNotFoundError(
                        "Report page not found",
                        page_id=page_id,
                        project_id=project_id,
                        report_id=report_id
                    )
                return dict(page)
                
        except (ReportPageValidationError, ReportPageNotFoundError):
            return None
        except Exception as e:
            logger.error(f"Error fetching report page {page_id}: {str(e)}")
            return None 