"""Core Exceptions Module

This module contains custom exception classes used throughout the application.
"""

class AppError(Exception):
    """Base exception class for application errors."""
    def __init__(self, message: str = None, code: int = None):
        self.message = message or "An unexpected error occurred"
        self.code = code or 500
        super().__init__(self.message)

class AuthorizationError(AppError):
    """Raised when user is not authorized to perform an action."""
    def __init__(self, message: str = None):
        super().__init__(message or "Not authorized", 403)

class DatabaseError(AppError):
    """Raised when a database operation fails."""
    def __init__(self, message: str = None):
        super().__init__(message or "Database operation failed", 500)

class RLSPolicyViolationError(AuthorizationError):
    """Raised when a Row Level Security policy is violated."""
    def __init__(self, message: str = None, table: str = None, operation: str = None):
        self.table = table
        self.operation = operation
        default_message = f"Access denied: Row Level Security policy violation"
        if table:
            default_message += f" for table '{table}'"
        if operation:
            default_message += f" during {operation} operation"
        super().__init__(message or default_message) 