"""Database Module

This module provides database connection pooling and management functionality.
"""

import os
from typing import Any, Optional
from urllib.parse import urlparse
from contextlib import contextmanager
from psycopg_pool import ConnectionPool
# Note: psycopg v3 doesn't have DictCursor in extras, using regular Cursor
# from psycopg.extras import DictCursor, Json
from app.core.exceptions import (
    DatabaseError, 
    RLSPolicyViolationError,
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ReportNotFoundError,
    ReportValidationError
)
from app.core.logging import get_logger
from threading import Lock
import psycopg
from flask import current_app
import re
import json

logger = get_logger(__name__)

# Initialize connection pool as None
_pool = None
_pool_lock = Lock()

def parse_rls_error(error_message: str) -> dict:
    """Parse RLS error message to extract table and operation information.
    
    Args:
        error_message: The PostgreSQL RLS error message
        
    Returns:
        dict: Parsed information including table, operation, etc.
    """
    info = {
        'table': None,
        'operation': None,
        'policy': None
    }
    
    # Extract table name from "violates row-level security policy for table \"table_name\""
    table_match = re.search(r'for table "([^"]+)"', error_message, re.IGNORECASE)
    if table_match:
        info['table'] = table_match.group(1)
    
    # Extract operation type (INSERT, UPDATE, DELETE, SELECT)
    if 'insert' in error_message.lower():
        info['operation'] = 'create'
    elif 'update' in error_message.lower():
        info['operation'] = 'update'
    elif 'delete' in error_message.lower():
        info['operation'] = 'delete'
    elif 'select' in error_message.lower():
        info['operation'] = 'access'
    
    return info

def parse_db_url(url: str) -> dict:
    """Parse database URL into connection parameters.
    
    Args:
        url: Database URL in format: 
            postgresql://user:password@host:port/dbname
            
    Returns:
        dict: Database connection parameters
    """
    parsed = urlparse(url)
    return {
        'dbname': parsed.path[1:],  # Remove leading '/'
        'user': parsed.username,
        'password': parsed.password,
        'host': parsed.hostname,
        'port': parsed.port or 5432
    }

def validate_connection(conn) -> bool:
    """Validate if a connection is alive and usable."""
    if conn is None or conn.closed:
        return False
    try:
        cur = conn.cursor()
        # Use a more robust validation query for Neon
        cur.execute('SELECT 1 as test')
        result = cur.fetchone()
        cur.close()
        return result is not None
    except (psycopg.OperationalError, psycopg.InterfaceError):
        return False
    except Exception as e:
        # Handle potential RLS or business logic errors during validation
        error_message = str(e).lower()
        if "project not found" in error_message or "access denied" in error_message or "violates row-level security policy" in error_message:
            # These indicate the connection is stale (Neon scaled down)
            logger.warning(f"Connection appears stale due to serverless scaling: {str(e)}")
            return False  # Force connection refresh
        return False

def init_db_pool(
    min_conn: int = 5,
    max_conn: int = 20,
    database_url: str = None
) -> None:
    """Initialize the database connection pool.
    
    Args:
        min_conn: Minimum number of connections
        max_conn: Maximum number of connections
        database_url: Database URL (if not provided, will use DATABASE_URL env var)
        
    Raises:
        DatabaseError: If pool initialization fails
    """
    global _pool
    
    with _pool_lock:
        if _pool is not None:
            # Test existing pool
            try:
                conn = _pool.getconn()
                if validate_connection(conn):
                    _pool.putconn(conn)
                    return
                else:
                    try:
                        _pool.putconn(conn)
                        conn.close()
                    except Exception as e:
                        logger.warning(f"Error closing invalid connection during pool test: {e}")
            except Exception as e:
                logger.warning(f"Error testing existing pool: {e}")
            
            try:
                _pool.closeall()
            except Exception as e:
                logger.warning(f"Error closing existing pool: {e}")
            _pool = None
        
        try:
            # Get database URL from environment if not provided
            db_url = database_url or os.getenv('DATABASE_URL')
            if not db_url:
                raise DatabaseError("Database URL not provided")
            
            # Parse database URL into connection parameters
            config = parse_db_url(db_url)
            
            # Create new pool
            _pool = ConnectionPool(
                min_size=min_conn,
                max_size=max_conn,
                conninfo=f"postgresql://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['dbname']}"
            )
            
            # Note: psycopg v3 doesn't have register_default_json in extras
            # JSON adapters are handled automatically in psycopg v3
            # from psycopg.extras import register_default_json, register_default_jsonb
            # register_default_json(globally=True)
            # register_default_jsonb(globally=True)
            
            # Validate pool by testing a connection
            conn = None
            try:
                conn = _pool.getconn()
                if not validate_connection(conn):
                    raise DatabaseError("Failed to validate initial database connection")
                _pool.putconn(conn)
                conn = None
            except Exception as e:
                if conn:
                    try:
                        _pool.putconn(conn)
                        conn.close()
                    except:
                        pass
                raise e
            
            logger.info("Database connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {str(e)}")
            if _pool:
                try:
                    _pool.closeall()
                except Exception as close_error:
                    logger.warning(f"Error closing failed pool: {close_error}")
                _pool = None
            raise DatabaseError(f"Failed to initialize database connection pool: {str(e)}")

def get_connection_pool() -> Optional[ConnectionPool]:
    """Get the database connection pool.
    
    Returns:
        ConnectionPool: The connection pool instance or None if not initialized
    """
    return _pool

@contextmanager
def get_db_connection():
    """Get a database connection from the pool.
    
    Yields:
        connection: Database connection object
        
    Raises:
        DatabaseError: If connection acquisition fails
    """
    conn = None
    pool = get_connection_pool()
    if not pool:
        raise DatabaseError("Database pool not initialized")
        
    max_retries = 3  # Add retry logic for Neon scaling
    retry_count = 0
    last_error = None
    
    # Retry logic OUTSIDE the context manager yield
    while retry_count < max_retries:
        try:
            conn = pool.getconn()
            
            if not validate_connection(conn):
                try:
                    pool.putconn(conn)
                    conn.close()
                except Exception as e:
                    logger.warning(f"Error closing invalid connection: {e}")
                    # If putconn fails, the connection might be corrupted, just close it
                    try:
                        conn.close()
                    except:
                        pass
                
                conn = pool.getconn()
                if not validate_connection(conn):
                    try:
                        pool.putconn(conn)
                        conn.close()
                    except Exception as e:
                        logger.warning(f"Error closing second invalid connection: {e}")
                        try:
                            conn.close()
                        except:
                            pass
                    raise DatabaseError("Failed to get valid database connection")
            
            break  # Success, exit retry loop
            
        except Exception as e:
            logger.error(f"Error getting database connection: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error occurred during connection acquisition (attempt {retry_count + 1})")
            
            if conn:
                try:
                    if not conn.closed:
                        pool.putconn(conn)
                        conn.close()
                except Exception as putconn_error:
                    logger.warning(f"Error returning failed connection to pool: {putconn_error}")
                    # If putconn fails, close connection directly
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
            
            # Store the error for potential re-raising
            last_error = e
            
            # Check if this is a business logic exception that should not be wrapped
            if isinstance(e, (ProjectNotFoundError, ProjectAccessDeniedError, ProjectValidationError, 
                             ReportNotFoundError, ReportValidationError, RLSPolicyViolationError)):
                # For Neon serverless, these might indicate stale connections
                error_message = str(e).lower()
                if "project not found" in error_message and retry_count < max_retries - 1:
                    logger.warning(f"ProjectNotFoundError likely due to Neon scaling, retrying connection...")
                    retry_count += 1
                    continue
                
                # Re-raise business logic exceptions directly after max retries
                logger.error(f"Business logic exception during connection after {retry_count + 1} attempts: {type(e).__name__}: {str(e)}")
                raise e
            
            # Check if the error message indicates a business logic error that might be due to scaling
            error_message = str(e).lower()
            if "project not found" in error_message:
                if retry_count < max_retries - 1:
                    logger.warning(f"'Project not found' error likely due to Neon scaling, retrying connection...")
                    retry_count += 1
                    continue
                else:
                    # This should not happen during connection acquisition - log for investigation
                    logger.error(f"UNEXPECTED: 'Project not found' error during connection acquisition after retries")
                    logger.error(f"This suggests a persistent database function or trigger issue")
                    raise e
            
            # For other errors, retry if we haven't exhausted attempts
            if retry_count < max_retries - 1:
                logger.warning(f"Database error on attempt {retry_count + 1}, retrying: {str(e)}")
                retry_count += 1
                continue
            else:
                # Exhausted all retries
                break
    
    # Check if we have a valid connection after retries
    if not conn:
        if last_error:
            if isinstance(last_error, (ProjectNotFoundError, ProjectAccessDeniedError, ProjectValidationError, 
                                     ReportNotFoundError, ReportValidationError, RLSPolicyViolationError)):
                raise last_error
            else:
                raise DatabaseError(f"Failed to get database connection after {max_retries} attempts: {str(last_error)}")
        else:
            raise DatabaseError("Failed to get database connection after all retries")
    
    # Now yield the connection in a clean context manager
    try:
        yield conn
    finally:
        if conn and pool:
            try:
                if not conn.closed:
                    pool.putconn(conn)
            except Exception as e:
                logger.error(f"Error returning connection to pool: {str(e)}")
                # If putconn fails, try to close the connection directly
                try:
                    if conn and not conn.closed:
                        conn.close()
                except Exception as close_error:
                    logger.error(f"Error closing connection after putconn failed: {close_error}")
        elif conn:
            # No pool available, close connection directly
            try:
                if not conn.closed:
                    conn.close()
            except Exception as e:
                logger.error(f"Error closing connection (no pool): {str(e)}")

@contextmanager
def get_db_cursor(commit: bool = False):
    """Get a database cursor.

    Args:
        commit: Whether to commit the transaction

    Yields:
        cursor: Database cursor object

    Raises:
        DatabaseError: If cursor operation fails
    """
    with get_db_connection() as conn:
        cursor = None
        try:
            cursor = conn.cursor()
            if cursor.closed:
                raise DatabaseError("Database cursor is closed immediately after creation")

            yield cursor

            if commit:
                conn.commit()
        except Exception as e:
            if commit and conn and not conn.closed:
                try:
                    conn.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {rollback_error}")
            
            error_message = str(e)
            
            # Check if this is a business logic exception that should not be wrapped
            if isinstance(e, (ProjectNotFoundError, ProjectAccessDeniedError, ProjectValidationError, 
                             ReportNotFoundError, ReportValidationError, RLSPolicyViolationError)):
                # Re-raise business logic exceptions directly
                raise e
            
            # Check if this is an RLS policy violation
            if "violates row-level security policy" in error_message.lower():
                logger.warning(f"RLS policy violation: {error_message}")
                # Parse the error to extract useful information
                rls_info = parse_rls_error(error_message)
                # Re-raise as specific RLS exception with parsed information
                raise RLSPolicyViolationError(
                    message=f"Access denied: Row Level Security policy violation",
                    table=rls_info.get('table'),
                    operation=rls_info.get('operation')
                )
            
            # Check for other permission-related errors that shouldn't be wrapped
            permission_errors = [
                "permission denied",
                "access denied",
                "insufficient privilege", 
                "authentication failed",
                "not authorized"
            ]
            
            if any(error_pattern in error_message.lower() for error_pattern in permission_errors):
                logger.warning(f"Permission error: {error_message}")
                # Re-raise the original exception to preserve error details
                raise e
            
            # For other errors (connection issues, etc.), wrap in DatabaseError
            logger.error(f"Database cursor error: {error_message}")
            raise DatabaseError(f"Database operation failed: {error_message}")
        finally:
            if cursor and not cursor.closed:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"Failed to close cursor: {str(e)}")

def refresh_connection_pool() -> None:
    """Refresh stale connections in the pool - useful for Neon serverless scaling."""
    global _pool
    with _pool_lock:
        if _pool:
            try:
                # Close all connections and reinitialize
                logger.info("Refreshing connection pool due to serverless scaling")
                _pool.closeall()
                _pool = None
                # Pool will be reinitialized on next request
            except Exception as e:
                logger.error(f"Error refreshing connection pool: {str(e)}")

def close_db_pool() -> None:
    """Close the database connection pool."""
    global _pool
    with _pool_lock:
        if _pool:
            try:
                # Only close if we're shutting down the app
                if not current_app or current_app.config.get('TESTING', False):
                    _pool.closeall()
                    _pool = None
                    logger.info("Database connection pool closed")
            except Exception as e:
                logger.error(f"Error closing database pool: {str(e)}")
                try:
                    _pool.closeall()
                except:
                    pass
                _pool = None 