"""Core Exceptions Module

This module contains custom exception classes used throughout the application.
"""

class AppError(Exception):
    """Base exception class for application errors."""
    def __init__(self, message: str = None, code: int = None):
        self.message = message or "An unexpected error occurred"
        self.code = code or 500
        super().__init__(self.message)

class ValidationError(AppError):
    """Base exception for validation errors."""
    def __init__(self, message: str = None):
        super().__init__(message or "Validation error", 400)

class AuthenticationError(AppError):
    """Raised when authentication fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Authentication required", 401)

class AuthorizationError(AppError):
    """Raised when authorization fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Access denied", 403)

class NotFoundError(AppError):
    """Raised when a resource is not found."""
    def __init__(self, message: str = None):
        super().__init__(message or "Resource not found", 404)

class DatabaseError(AppError):
    """Raised when a database operation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Database operation failed", 500)

# Project-specific exceptions
class ProjectError(AppError):
    """Base exception for project-related errors."""
    pass

class ProjectNotFoundError(ProjectError):
    """Exception raised when a project is not found."""
    def __init__(self, message: str = None):
        super().__init__(message or "Project not found")

class ProjectAccessDeniedError(ProjectError):
    """Exception raised when user lacks required project access."""
    def __init__(self, message: str = None):
        super().__init__(message or "You don't have permission to access this project")

class ProjectValidationError(ProjectError):
    """Exception raised when project validation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Invalid project data")

class ProjectDatabaseError(DatabaseError):
    """Raised when a project-related database operation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Project database operation failed")

# Rate limiting exceptions
class RateLimitExceededError(AppError):
    """Raised when rate limit is exceeded."""
    def __init__(self, message: str = None):
        super().__init__(message or "Rate limit exceeded", 429)

# Cache exceptions
class CacheError(AppError):
    """Raised when a cache operation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Cache operation failed", 500)

# Session exceptions
class SessionError(AppError):
    """Raised when a session operation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Session operation failed", 500)

# Report-specific exceptions
class ReportNotFoundError(Exception):
    """Raised when a report is not found."""
    pass

class ReportValidationError(Exception):
    """Raised when report data validation fails."""
    pass

# Chatbot-specific exceptions
class ChatbotError(AppError):
    """Base exception for chatbot-related errors."""
    pass

class QueryValidationError(ChatbotError):
    """Exception raised when query validation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Invalid query format or content")

class ReportUrlValidationError(ChatbotError):
    """Exception raised when Power BI report URL validation fails."""
    def __init__(self, field: str = None, value: str = None):
        message = f"Invalid Power BI report URL"
        if field and value:
            message = f"Invalid {field}: {value}"
        super().__init__(message)

class FilterValidationError(ChatbotError):
    """Exception raised when filter parameters validation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Invalid filter parameters")

# Share-specific exceptions
class ShareLinkError(ProjectError):
    """Base exception for share link related errors."""
    pass

class ShareLinkExpiredError(ShareLinkError):
    """Exception raised when a share link has expired."""
    pass

class ShareLinkInvalidError(ShareLinkError):
    """Exception raised when a share link is invalid."""
    pass

class ShareLinkMaxUsesError(ShareLinkError):
    """Exception raised when a share link has reached maximum uses."""
    pass

class ShareLinkDeactivatedError(ShareLinkError):
    """Exception raised when attempting to use a deactivated share link."""
    pass 