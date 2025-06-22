"""Validators for Synonyms Module

This module contains validation functions and custom exceptions for the synonyms functionality.
"""

from typing import Optional

class SynonymValidationError(Exception):
    """Exception raised for validation errors in synonym operations."""
    
    def __init__(self, message: str, field: Optional[str] = None, value: Optional[str] = None):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)

class SynonymNotFoundError(Exception):
    """Exception raised when a synonym is not found."""
    
    def __init__(
        self,
        message: str,
        table: Optional[str] = None,
        field: Optional[str] = None,
        field_type: Optional[str] = None
    ):
        self.message = message
        self.table = table
        self.field = field
        self.field_type = field_type
        super().__init__(self.message)

def validate_field_type(field_type: str) -> None:
    """Validate the field type.
    
    Args:
        field_type: The field type to validate
        
    Raises:
        SynonymValidationError: If field_type is invalid
    """
    valid_types = ['column', 'measure']
    if field_type not in valid_types:
        raise SynonymValidationError(
            f"Invalid field type. Must be one of: {', '.join(valid_types)}",
            field='field_type',
            value=field_type
        )

def validate_required_fields(
    table: Optional[str] = None,
    field: Optional[str] = None,
    field_type: Optional[str] = None,
    synonym: Optional[str] = None,
    require_all: bool = True
) -> None:
    """Validate required fields for synonym operations.
    
    Args:
        table: The table name
        field: The field name
        field_type: The field type
        synonym: The synonym value
        require_all: Whether all fields are required
        
    Raises:
        SynonymValidationError: If required fields are missing or invalid
    """
    if require_all:
        if not all([table, field, field_type]):
            raise SynonymValidationError(
                "Missing required fields: table, field, and field_type are required"
            )
        if synonym is not None and not synonym:
            raise SynonymValidationError(
                "Synonym value cannot be empty",
                field='synonym',
                value=synonym
            )
    else:
        if table and not isinstance(table, str):
            raise SynonymValidationError(
                "Table name must be a string",
                field='table',
                value=str(table)
            )
        if field and not isinstance(field, str):
            raise SynonymValidationError(
                "Field name must be a string",
                field='field',
                value=str(field)
            )
        if field_type:
            validate_field_type(field_type) 