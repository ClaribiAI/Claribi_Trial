"""Report Pages Exceptions Module

This module contains custom exceptions for report pages functionality.
"""

class ReportPageError(Exception):
    """Base exception class for report pages errors."""
    pass


class ReportPageNotFoundError(ReportPageError):
    """Exception raised when a report page is not found.
    
    Args:
        message (str): The error message
        page_id (int, optional): The ID of the page that was not found
        project_id (int, optional): The ID of the project
        report_id (int, optional): The ID of the report
    """
    def __init__(self, message: str, page_id: int = None, project_id: int = None, report_id: int = None):
        self.page_id = page_id
        self.project_id = project_id
        self.report_id = report_id
        super().__init__(message)


class ReportPageValidationError(ReportPageError):
    """Exception raised when report page validation fails.
    
    Args:
        message (str): The error message
        field (str, optional): The name of the field that failed validation
        value (Any, optional): The invalid value
    """
    def __init__(self, message: str, field: str = None, value: any = None):
        self.field = field
        self.value = value
        super().__init__(message) 