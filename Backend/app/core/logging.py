"""Logging Module

This module provides structured logging configuration.
"""

import os
import sys
import logging
import json
from datetime import datetime
from typing import Any, Dict
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            str: JSON formatted log entry
        """
        # Base log entry
        log_entry = {
            'timestamp': datetime.utcfromtimestamp(record.created).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': str(record.exc_info[0].__name__),
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        # Add extra fields
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        return json.dumps(log_entry)

def setup_logging(
    log_level: str = 'INFO',
    log_file: str = None,
    max_bytes: int = 10485760,  # 10MB
    backup_count: int = 5
) -> None:
    """Set up logging configuration.
    
    Args:
        log_level: Logging level
        log_file: Path to log file
        max_bytes: Maximum size of each log file
        backup_count: Number of backup files to keep
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create JSON formatter
    formatter = JsonFormatter()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler if log file specified
    if log_file:
        # Create log directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Rotating file handler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        logging.Logger: Logger instance
    """
    return logging.getLogger(name)

class LoggerAdapter(logging.LoggerAdapter):
    """Logger adapter for adding extra fields."""
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Process the logging message and kwargs.
        
        Args:
            msg: Log message
            kwargs: Keyword arguments
            
        Returns:
            tuple: (modified message, modified kwargs)
        """
        kwargs["extra"] = kwargs.get("extra", {})
        kwargs["extra"]["extra_fields"] = self.extra
        return msg, kwargs

def get_logger_with_context(name: str, **context) -> LoggerAdapter:
    """Get a logger with additional context fields.
    
    Args:
        name: Logger name
        **context: Additional context fields
        
    Returns:
        LoggerAdapter: Logger adapter with context
    """
    logger = get_logger(name)
    return LoggerAdapter(logger, context) 