"""Chatbot Validators Module

This module contains validation functions and custom exceptions for chatbot operations.
"""

from typing import Optional, Dict, Any
import re
from urllib.parse import urlparse

class ChatbotValidationError(Exception):
    """Base exception for chatbot validation errors."""
    
    def __init__(self, message: str, field: Optional[str] = None, value: Any = None):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)

class QueryValidationError(ChatbotValidationError):
    """Exception raised for invalid query format or content."""
    pass

class ReportUrlValidationError(ChatbotValidationError):
    """Exception raised for invalid Power BI report URLs."""
    pass

class FilterValidationError(ChatbotValidationError):
    """Exception raised for invalid filter parameters."""
    pass

def validate_query(query: str) -> None:
    """Validate the natural language query.
    
    Args:
        query: The query string to validate
        
    Raises:
        QueryValidationError: If the query is invalid
    """
    if not query:
        raise QueryValidationError("Query cannot be empty", "query", query)
    
    if len(query.strip()) < 3:
        raise QueryValidationError(
            "Query must be at least 3 characters long",
            "query",
            query
        )
    
    if len(query) > 1000:
        raise QueryValidationError(
            "Query is too long (max 1000 characters)",
            "query",
            query
        )

def validate_powerbi_url(url: str) -> None:
    """Validate a Power BI report URL.
    
    Args:
        url: The URL to validate
        
    Raises:
        ReportUrlValidationError: If the URL is invalid
    """
    if not url:
        raise ReportUrlValidationError("URL cannot be empty", "url", url)
    
    try:
        parsed = urlparse(url)
        if not all([parsed.scheme, parsed.netloc]):
            raise ReportUrlValidationError("Invalid URL format", "url", url)
        
        # Validate Power BI domain
        if not parsed.netloc.endswith('powerbi.com'):
            raise ReportUrlValidationError(
                "URL must be a Power BI domain",
                "url",
                url
            )
        
        # Validate report URL patterns
        valid_patterns = [
            r'https://app\.powerbi\.com/reportEmbed\?',
            r'https://app\.powerbi\.com/groups/[\w-]+/reports/[\w-]+',
            r'https://app\.powerbi\.com/groups/me/apps/[\w-]+/reports/[\w-]+',
        ]
        
        if not any(re.match(pattern, url) for pattern in valid_patterns):
            raise ReportUrlValidationError(
                "Invalid Power BI report URL format",
                "url",
                url
            )
            
    except Exception as e:
        if not isinstance(e, ReportUrlValidationError):
            raise ReportUrlValidationError(f"Invalid URL: {str(e)}", "url", url)
        raise

def validate_filter_parameters(
    field_value_pairs: Dict[str, Any],
    field_to_table: Dict[str, str],
    field_to_operator: Dict[str, str]
) -> None:
    """Validate filter parameters for query processing.
    
    Args:
        field_value_pairs: Dictionary of field names to their values
        field_to_table: Dictionary mapping fields to their table names
        field_to_operator: Dictionary mapping fields to their operators
        
    Raises:
        FilterValidationError: If any filter parameters are invalid
    """
    valid_operators = {'eq', 'ne', 'gt', 'lt', 'ge', 'le', 'in'}
    
    if not field_value_pairs:
        raise FilterValidationError(
            "No field-value pairs provided",
            "field_value_pairs",
            field_value_pairs
        )
    
    for field, value in field_value_pairs.items():
        # Validate field has a table mapping
        if field not in field_to_table:
            raise FilterValidationError(
                f"No table mapping found for field: {field}",
                "field_to_table",
                field
            )
        
        # Validate operator if specified
        if field in field_to_operator:
            operator = field_to_operator[field]
            if operator not in valid_operators:
                raise FilterValidationError(
                    f"Invalid operator '{operator}' for field: {field}",
                    "field_to_operator",
                    operator
                )
            
            # Validate numeric operators have numeric values
            if operator in {'gt', 'lt', 'ge', 'le'}:
                try:
                    float(value)
                except (ValueError, TypeError):
                    raise FilterValidationError(
                        f"Non-numeric value '{value}' used with numeric operator '{operator}'",
                        field,
                        value
                    )
            
            # Validate 'in' operator values
            if operator == 'in' and ',' in str(value):
                values = [v.strip() for v in str(value).split(',')]
                if not values:
                    raise FilterValidationError(
                        f"Empty value list for 'in' operator on field: {field}",
                        field,
                        value
                    ) 