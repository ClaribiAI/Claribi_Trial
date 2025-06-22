"""Report Pages Validators Module

This module contains validation functions for report pages.
"""

from typing import Optional
from .report_pages_exceptions import ReportPageValidationError


def validate_page_url(url: str) -> None:
    """Validate a Power BI report page URL.
    
    Args:
        url: The URL to validate
        
    Raises:
        ReportPageValidationError: If the URL is invalid
    """
    if not url:
        raise ReportPageValidationError("URL is required", field="page_url")
    
    if not url.startswith('https://app.powerbi.com/'):
        raise ReportPageValidationError(
            "Invalid Power BI report URL",
            field="page_url",
            value=url
        )


def validate_page_name(name: str) -> None:
    """Validate a report page name.
    
    Args:
        name: The name to validate
        
    Raises:
        ReportPageValidationError: If the name is invalid
    """
    if not name:
        raise ReportPageValidationError("Page name is required", field="page_name")
    
    if len(name) > 1000:  # Assuming max length of 255 characters
        raise ReportPageValidationError(
            "Page name is too long (maximum 1000 characters)",
            field="page_name",
            value=name
        )


def validate_required_ids(
    page_id: Optional[int] = None,
    project_id: Optional[int] = None,
    report_id: Optional[int] = None,
    require_all: bool = True
) -> None:
    """Validate required IDs for report page operations.
    
    Args:
        page_id: The page ID to validate
        project_id: The project ID to validate
        report_id: The report ID to validate
        require_all: Whether all IDs are required or just the ones provided
        
    Raises:
        ReportPageValidationError: If any required ID is invalid
    """
    if require_all:
        if not all(x is not None for x in [page_id, project_id, report_id]):
            raise ReportPageValidationError("Page ID, Project ID, and Report ID are all required")
    
    if page_id is not None and page_id <= 0:
        raise ReportPageValidationError("Invalid page ID", field="page_id", value=page_id)
    
    if project_id is not None and project_id <= 0:
        raise ReportPageValidationError("Invalid project ID", field="project_id", value=project_id)
    
    if report_id is not None and report_id <= 0:
        raise ReportPageValidationError("Invalid report ID", field="report_id", value=report_id) 